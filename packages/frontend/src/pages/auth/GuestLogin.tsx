import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Button } from '../../components/common';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { getErrorMessage, useAuth, useRedirectIfAuthenticated } from '../../context/AuthContext';

function GuestLoginPanel() {
  const { guestLogin } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    setError(null);
    setLoading(true);
    try {
      await guestLogin();
      // Not '/' — that's the patient dashboard. Guests can only reach the
      // symptom checker (see App.tsx's routing tree).
      navigate('/symptom-checker', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not start a guest session. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {error && (
        <Alert type="error" description={error} dismissible onDismiss={() => setError(null)} />
      )}

      <Alert
        type="warning"
        title="Limited features"
        description="Guest sessions can run symptom analysis but can't save history, book appointments, or receive notifications. Your data won't be saved when the session ends."
      />

      <Button fullWidth loading={loading} onClick={handleContinue}>
        Continue as guest
      </Button>

      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        Want to save your data?{' '}
        <Link
          to="/signup"
          className="font-medium text-primary-600 hover:underline dark:text-primary-400"
        >
          Create an account
        </Link>{' '}
        — you can always sign up later.
      </p>

      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        <Link
          to="/login"
          className="font-medium text-primary-600 hover:underline dark:text-primary-400"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export default function GuestLogin() {
  useRedirectIfAuthenticated();

  return (
    <AuthLayout
      title="Continue without an account"
      subtitle="Try MedAssist AI's symptom checker as a guest"
    >
      <GuestLoginPanel />
    </AuthLayout>
  );
}
