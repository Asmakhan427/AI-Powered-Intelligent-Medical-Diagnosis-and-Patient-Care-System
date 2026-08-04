import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import Login from '../../pages/auth/Login';
import { AuthProvider } from '../../context/AuthContext';
import { api } from '../../lib/api';

// Mocks the network boundary only — AuthProvider/useAuth/the real Login
// component all run for real, so this exercises the actual integration
// (form -> zod validation -> AuthContext.login -> api.post), not a stub.
vi.mock('../../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../../lib/api')>('../../lib/api');
  return {
    ...actual,
    api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  };
});

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Login page', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockRejectedValue({ isAxiosError: true, response: undefined }); // boot-time /auth/me: no stored session
  });

  it('renders the login form', () => {
    renderLogin();

    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: /account type/i })).toBeInTheDocument();
  });

  it('shows validation errors instead of submitting when the form is empty', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(vi.mocked(api.post)).not.toHaveBeenCalled();
  });

  it('submits credentials and shows a welcome toast on success', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        userId: 42,
        name: 'Jane Doe',
        role: 'patient',
        accessToken: 'access',
        refreshToken: 'refresh',
        expiresIn: '15m',
      },
    });
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password1');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // AuthContext.login keeps `rememberMe` client-side (it only decides
    // localStorage vs sessionStorage) and never forwards it in the request body.
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        email: 'jane@example.com',
        password: 'password1',
        role: 'patient',
      })
    );
    expect(await screen.findByText(/welcome back, jane doe/i)).toBeInTheDocument();
  });

  it('displays an inline error and does not navigate away on invalid credentials', async () => {
    vi.mocked(api.post).mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { success: false, error: 'Invalid credentials' } },
    });
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // Both the inline alert and a toast render the same message, so scope
    // the query to the alert rather than an exact-text lookup across the page.
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Invalid credentials')).toBeInTheDocument();
    // Still on the login form.
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('switches the selected role when Doctor is chosen', async () => {
    const user = userEvent.setup();
    renderLogin();

    const doctorOption = screen.getByRole('radio', { name: /doctor/i });
    expect(doctorOption).not.toBeChecked();

    await user.click(doctorOption);

    expect(doctorOption).toBeChecked();
  });
});
