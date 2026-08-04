import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach, type Mock } from 'vitest';
import type { ReactNode } from 'react';
import { AuthProvider } from '../../context/AuthContext';
import { useAuth, useRequireRole } from '../../hooks/useAuth';
import { api } from '../../lib/api';

vi.mock('../../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../../lib/api')>('../../lib/api');
  return {
    ...actual,
    api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  };
});

function wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider>{children}</AuthProvider>
    </MemoryRouter>
  );
}

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    (api.get as Mock).mockRejectedValue({ isAxiosError: true, response: undefined }); // no stored session by default
  });

  it('starts unauthenticated and becomes authenticated after login()', async () => {
    (api.post as Mock).mockResolvedValueOnce({
      data: {
        userId: 1,
        name: 'Jane Doe',
        role: 'patient',
        accessToken: 'access',
        refreshToken: 'refresh',
        expiresIn: '15m',
      },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);

    await act(async () => {
      await result.current.login('jane@example.com', 'password1', 'patient', true);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.name).toBe('Jane Doe');
    expect(result.current.isPatient).toBe(true);
    expect(result.current.isDoctor).toBe(false);
    // Persisted per the "remember me" flag.
    expect(localStorage.getItem('medassist.auth')).toContain('Jane Doe');
  });

  it('surfaces login failures via `error` without setting a user', async () => {
    (api.post as Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { success: false, error: 'Invalid credentials' } },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login('jane@example.com', 'wrong', 'patient', true).catch(() => {});
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).toBe('Invalid credentials');
  });

  it('clears the session on logout()', async () => {
    (api.post as Mock)
      .mockResolvedValueOnce({
        data: {
          userId: 1,
          name: 'Jane Doe',
          role: 'patient',
          accessToken: 'access',
          refreshToken: 'refresh',
          expiresIn: '15m',
        },
      })
      .mockResolvedValueOnce({ data: {} }); // /auth/logout

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login('jane@example.com', 'password1', 'patient', true);
    });
    expect(result.current.isAuthenticated).toBe(true);

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('medassist.auth')).toBeNull();
  });

  it('guest login issues a guest identity marked isGuest, session-scoped (not localStorage)', async () => {
    (api.post as Mock).mockResolvedValueOnce({
      data: {
        guestId: 'GUEST_abc123',
        role: 'guest',
        accessToken: 'guest-access',
        refreshToken: 'guest-refresh',
        expiresIn: '24h',
      },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.guestLogin();
    });

    expect(result.current.isGuest).toBe(true);
    expect(result.current.user?.id).toBe('GUEST_abc123');
    // "Remember me" never applies to a guest session.
    expect(localStorage.getItem('medassist.auth')).toBeNull();
    expect(sessionStorage.getItem('medassist.auth')).toContain('GUEST_abc123');
  });
});

describe('useRequireRole (protected routes)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  function ProtectedPage() {
    const { isReady } = useRequireRole('doctor');
    return <div>{isReady ? 'Doctor content' : 'Checking access…'}</div>;
  }

  it('redirects to /login when nobody is signed in', async () => {
    (api.get as Mock).mockRejectedValue({ isAxiosError: true, response: undefined });

    render(
      <MemoryRouter initialEntries={['/doctor']}>
        <AuthProvider>
          <Routes>
            <Route path="/doctor" element={<ProtectedPage />} />
            <Route path="/login" element={<div>Login page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('Login page')).toBeInTheDocument();
  });

  it('redirects a signed-in patient away from a doctor-only route to their own role home, not /login', async () => {
    localStorage.setItem(
      'medassist.auth',
      JSON.stringify({
        accessToken: 'a',
        refreshToken: 'r',
        user: { id: '1', name: 'Jane', role: 'patient' },
      })
    );
    (api.get as Mock).mockResolvedValue({
      data: { user: { id: '1', name: 'Jane', role: 'patient' } },
    });

    render(
      <MemoryRouter initialEntries={['/doctor']}>
        <AuthProvider>
          <Routes>
            <Route path="/doctor" element={<ProtectedPage />} />
            <Route path="/" element={<div>Patient dashboard</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('Patient dashboard')).toBeInTheDocument();
  });

  it('renders the protected content once a matching-role session is confirmed', async () => {
    localStorage.setItem(
      'medassist.auth',
      JSON.stringify({
        accessToken: 'a',
        refreshToken: 'r',
        user: { id: '5', name: 'Dr. Sarah', role: 'doctor' },
      })
    );
    (api.get as Mock).mockResolvedValue({
      data: { user: { id: '5', name: 'Dr. Sarah', role: 'doctor' } },
    });

    render(
      <MemoryRouter initialEntries={['/doctor']}>
        <AuthProvider>
          <Routes>
            <Route path="/doctor" element={<ProtectedPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('Doctor content')).toBeInTheDocument();
  });
});
