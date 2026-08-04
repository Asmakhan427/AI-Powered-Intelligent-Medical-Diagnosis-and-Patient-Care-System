import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getErrorMessage } from '../lib/api';
import { clearStoredAuth, getStoredAuth, setStoredAuth, type StoredUser } from '../lib/authStorage';

export type AuthUser = StoredUser;

/** Each role's default landing page — used to send a signed-in visitor somewhere sensible without looping. */
export const ROLE_HOME: Record<AuthUser['role'], string> = {
  patient: '/',
  doctor: '/doctor',
  guest: '/guest',
};

export interface SignupPayload {
  name: string;
  email: string;
  phone?: string;
  password: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** True only during the initial boot-time session check. */
  isLoading: boolean;
  /** Set when login/signup/guestLogin fails; cleared on the next attempt. Pages may still keep their own local error state for inline form display. */
  error: string | null;
  isPatient: boolean;
  isDoctor: boolean;
  isGuest: boolean;
  login: (
    email: string,
    password: string,
    role: 'patient' | 'doctor',
    remember: boolean
  ) => Promise<AuthUser>;
  signup: (payload: SignupPayload, remember: boolean) => Promise<AuthUser>;
  guestLogin: () => Promise<AuthUser>;
  logout: () => Promise<void>;
  /** Hydrates the session from tokens obtained outside the normal login/signup calls (e.g. an OAuth callback redirect). */
  hydrateSession: (tokens: TokenPair, user: AuthUser, remember?: boolean) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Boot-time session check: optimistically trust the persisted user for a
  // fast first paint, then confirm against /auth/me (the request
  // interceptor attaches the token; the response interceptor refreshes it
  // once on a 401). Only clears state if that confirmation definitively fails.
  useEffect(() => {
    const stored = getStoredAuth();
    if (!stored) {
      setIsLoading(false);
      return;
    }
    setUser(stored.user);

    api
      .get<{ user: Record<string, unknown> }>('/auth/me')
      .then(({ data }) => {
        const role = data.user.role as AuthUser['role'];
        setUser({
          id: String(data.user.id ?? data.user._id ?? stored.user.id),
          name: String(data.user.name ?? stored.user.name),
          email: (data.user.email as string | undefined) ?? stored.user.email,
          role,
        });
      })
      .catch(() => {
        clearStoredAuth();
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(
    async (
      email: string,
      password: string,
      role: 'patient' | 'doctor',
      remember: boolean
    ): Promise<AuthUser> => {
      setError(null);
      try {
        const { data } = await api.post<
          TokenPair & { userId: number | string; name: string; role: string }
        >('/auth/login', { email, password, role });
        const authUser: AuthUser = { id: String(data.userId), name: data.name, email, role };
        setStoredAuth(
          { accessToken: data.accessToken, refreshToken: data.refreshToken, user: authUser },
          remember
        );
        setUser(authUser);
        return authUser;
      } catch (err) {
        setError(getErrorMessage(err, 'Invalid email or password.'));
        throw err;
      }
    },
    []
  );

  const signup = useCallback(
    async (payload: SignupPayload, remember: boolean): Promise<AuthUser> => {
      setError(null);
      try {
        const { data } = await api.post<
          TokenPair & { user: { id: number | string; name: string; email: string; role: string } }
        >('/auth/signup', payload);
        const authUser: AuthUser = {
          id: String(data.user.id),
          name: data.user.name,
          email: data.user.email,
          role: 'patient',
        };
        setStoredAuth(
          { accessToken: data.accessToken, refreshToken: data.refreshToken, user: authUser },
          remember
        );
        setUser(authUser);
        return authUser;
      } catch (err) {
        setError(getErrorMessage(err, 'Could not create your account.'));
        throw err;
      }
    },
    []
  );

  const guestLogin = useCallback(async (): Promise<AuthUser> => {
    setError(null);
    try {
      const { data } = await api.post<TokenPair & { guestId: string; role: string }>('/auth/guest');
      const authUser: AuthUser = { id: data.guestId, name: 'Guest User', role: 'guest' };
      // Guest sessions are always tab-scoped, regardless of "remember me".
      setStoredAuth(
        { accessToken: data.accessToken, refreshToken: data.refreshToken, user: authUser },
        false
      );
      setUser(authUser);
      return authUser;
    } catch (err) {
      setError(getErrorMessage(err, 'Could not start a guest session.'));
      throw err;
    }
  }, []);

  const hydrateSession = useCallback(
    (tokens: TokenPair, authUser: AuthUser, remember = true): void => {
      setStoredAuth(
        { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user: authUser },
        remember
      );
      setUser(authUser);
    },
    []
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Best-effort: stateless JWTs can't be server-invalidated anyway.
    } finally {
      clearStoredAuth();
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      error,
      isPatient: user?.role === 'patient',
      isDoctor: user?.role === 'doctor',
      isGuest: user?.role === 'guest',
      login,
      signup,
      guestLogin,
      logout,
      hydrateSession,
    }),
    [user, isLoading, error, login, signup, guestLogin, logout, hydrateSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>');
  return ctx;
}

/**
 * Sends an already-authenticated visitor away from a public-only page
 * (login/signup/guest). Defaults to that user's own role home so it never
 * bounces a doctor toward the patient dashboard (or vice versa); pass `to`
 * to override.
 */
export function useRedirectIfAuthenticated(to?: string): void {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const destination = to ?? (user ? ROLE_HOME[user.role] : '/');

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate(destination, { replace: true });
  }, [isLoading, isAuthenticated, navigate, destination]);
}

export { getErrorMessage };
