import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Alert, Button, Input } from '../../components/common';
import { CheckCircleIcon } from '../../components/common/icons';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { api } from '../../lib/api';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from './authSchemas';

/**
 * NOTE: the backend does not implement POST /auth/forgot-password yet (see
 * packages/backend/src/routes/auth.routes.ts) — this page is built against
 * the REST contract that endpoint should expose once added.
 */
export default function ForgotPassword() {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async ({ email }: ForgotPasswordFormValues) => {
    setNetworkError(null);
    try {
      await api.post('/auth/forgot-password', { email });
      setSubmittedEmail(email);
    } catch (err) {
      // Deliberately do NOT reveal whether the email exists — any response
      // from the server (including a 404 for the not-yet-built route) still
      // shows the generic success state. Only a genuine network failure
      // (server unreachable) surfaces as an error.
      if (axios.isAxiosError(err) && !err.response) {
        setNetworkError('Could not reach the server. Check your connection and try again.');
        return;
      }
      setSubmittedEmail(email);
    }
  };

  if (submittedEmail) {
    return (
      <AuthLayout title="Check your email">
        <div className="space-y-5 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400">
            <CheckCircleIcon className="h-6 w-6" />
          </span>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            If an account exists for{' '}
            <span className="font-medium text-gray-900 dark:text-gray-100">{submittedEmail}</span>,
            we&apos;ve sent a link to reset your password.
          </p>
          <Link
            to="/login"
            className="inline-block text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
          >
            Back to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a reset link"
    >
      <div className="space-y-5">
        {networkError && (
          <Alert
            type="error"
            description={networkError}
            dismissible
            onDismiss={() => setNetworkError(null)}
          />
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <Button type="submit" fullWidth loading={isSubmitting}>
            Send reset link
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          Remembered it?{' '}
          <Link
            to="/login"
            className="font-medium text-primary-600 hover:underline dark:text-primary-400"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
