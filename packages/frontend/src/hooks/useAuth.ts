// The canonical AuthProvider/useAuth implementation lives in
// context/AuthContext.tsx (colocated with the provider, the idiomatic React
// pattern, and already the import path used across every page in this
// codebase). This module re-exports it under the requested hooks/ path
// instead of relocating it — moving it would mean touching every existing
// import site for no functional benefit — and adds the two genuinely new
// hook-shaped guards that didn't exist yet.
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROLE_HOME, useAuth, type AuthUser } from '../context/AuthContext';

export { useAuth };
export type { AuthContextValue, AuthUser, SignupPayload } from '../context/AuthContext';

/**
 * Hook-shaped equivalent of `<ProtectedRoute />` for use inside a component
 * body rather than as a route wrapper — e.g. a component reused both inside
 * and outside a guarded route tree. Redirects to /login (preserving the
 * current path) if not authenticated once the boot-time session check
 * settles.
 */
export function useRequireAuth(): { user: AuthUser | null; isReady: boolean } {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { state: { from: location.pathname }, replace: true });
    }
  }, [isLoading, isAuthenticated, navigate, location.pathname]);

  return { user, isReady: !isLoading && isAuthenticated };
}

/**
 * Like `useRequireAuth`, but also redirects away if the signed-in user's
 * role doesn't match — to *their own* role home (via `ROLE_HOME`), never a
 * hardcoded path, so it can't loop between two role-gated areas.
 */
export function useRequireRole(role: AuthUser['role'] | AuthUser['role'][]): {
  user: AuthUser | null;
  isReady: boolean;
} {
  const allowed = Array.isArray(role) ? role : [role];
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location.pathname }, replace: true });
      return;
    }
    if (user && !allowed.includes(user.role)) {
      navigate(ROLE_HOME[user.role], { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isAuthenticated, user, navigate, location.pathname]);

  return { user, isReady: !isLoading && isAuthenticated && !!user && allowed.includes(user.role) };
}
