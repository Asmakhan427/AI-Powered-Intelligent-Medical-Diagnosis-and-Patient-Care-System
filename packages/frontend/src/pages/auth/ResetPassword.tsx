import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Button, Input } from '../../components/common';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { api, getErrorMessage } from '../../lib/api';
import { resetPasswordSchema, type ResetPasswordFormValues } from './authSchemas';

/**
 * NOTE: the backend does not implement POST /auth/reset-password yet (see
 * packages/backend/src/routes/auth.routes.ts) — this page is built against
 * the REST contract that endpoint should expose once added. It expects the
 * reset link to look like `/reset-password?token=...`.
 */
export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: ResetPasswordFormValues) => {
    setFormError(null);
    try {
      await api.post('/auth/reset-password', { token, password: values.password });
      setDone(true);
    } catch (err) {
      setFormError(getErrorMessage(err, 'This reset link is invalid or has expired.'));
    }
  };

  if (!token) {
    return (
      <AuthLayout title="Invalid reset link">
        <div className="space-y-4">
          <Alert
            type="error"
            description="This password reset link is invalid or incomplete. Please request a new one."
          />
          <Link
            to="/forgot-password"
            className="block text-center text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
          >
            Request a new link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout title="Password updated">
        <div className="space-y-5 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Your password has been reset. You can now sign in with your new password.
          </p>
          <Button fullWidth onClick={() => navigate('/login', { replace: true })}>
            Go to sign in
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Set a new password" subtitle="Choose a new password for your account">
      <div className="space-y-5">
        {formError && (
          <Alert
            type="error"
            description={formError}
            dismissible
            onDismiss={() => setFormError(null)}
          />
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <Input
            label="New password"
            type="password"
            placeholder="At least 6 characters"
            error={errors.password?.message}
            {...register('password')}
          />

          <Input
            label="Confirm new password"
            type="password"
            placeholder="••••••••"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          <Button type="submit" fullWidth loading={isSubmitting}>
            Reset password
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
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
