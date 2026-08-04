import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Loader } from '../../components/common';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { api, getErrorMessage } from '../../lib/api';
import { useAuth, type AuthUser } from '../../context/AuthContext';

type Status = 'processing' | 'error';

/**
 * NOTE: no OAuth/social login provider is wired up on the backend yet (no
 * passport strategy, no /auth/google or similar route in
 * packages/backend/src/routes/auth.routes.ts). This page is built against
 * the redirect contract such a flow would need — the provider completes the
 * OAuth dance server-side, then redirects here with the issued tokens in
 * the query string:
 *   /auth/callback?accessToken=...&refreshToken=...&id=...&name=...&role=...&email=...
 * It's otherwise a working scaffold for whichever provider gets added.
 */
export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const { hydrateSession, logout } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('processing');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const id = searchParams.get('id');
    const name = searchParams.get('name');
    const role = searchParams.get('role') as AuthUser['role'] | null;
    const email = searchParams.get('email') ?? undefined;

    if (!accessToken || !refreshToken || !id || !name || !role) {
      setStatus('error');
      setError('This sign-in link is missing required information. Please try signing in again.');
      return;
    }

    hydrateSession({ accessToken, refreshToken }, { id, name, email, role });

    // Confirm the token actually works before trusting it and routing onward.
    api
      .get('/auth/me')
      .then(() => navigate('/', { replace: true }))
      .catch((err) => {
        void logout();
        setStatus('error');
        setError(getErrorMessage(err, 'Could not verify your sign-in. Please try again.'));
      });
  }, [searchParams, hydrateSession, logout, navigate]);

  if (status === 'error') {
    return (
      <AuthLayout title="Sign-in failed">
        <div className="space-y-4">
          <Alert type="error" description={error ?? 'Something went wrong during sign-in.'} />
          <Link
            to="/login"
            className="block text-center text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
          >
            Back to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Signing you in…">
      <div className="flex justify-center py-6">
        <Loader text="Completing sign-in…" />
      </div>
    </AuthLayout>
  );
}
