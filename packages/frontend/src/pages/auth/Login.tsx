import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Input, useToast } from '../../components/common';
import { AuthLayout } from '../../components/layout/AuthLayout';
import {
  ROLE_HOME,
  getErrorMessage,
  useAuth,
  useRedirectIfAuthenticated,
} from '../../context/AuthContext';
import { cn } from '../../lib/cn';
import { loginSchema, type LoginFormValues } from './authSchemas';

const ROLES: Array<{ value: LoginFormValues['role']; label: string }> = [
  { value: 'patient', label: 'Patient' },
  { value: 'doctor', label: 'Doctor' },
];

function LoginForm() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', role: 'patient', rememberMe: true },
  });

  const selectedRole = watch('role');
  const redirectFrom = (location.state as { from?: string } | null)?.from;

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null);
    try {
      const user = await login(values.email, values.password, values.role, values.rememberMe);
      toast.success(`Welcome back, ${user.name}!`);
      // Send them back where they came from if we know it, otherwise their
      // own role's home. If "from" belonged to a different role's area
      // (e.g. they picked the wrong role at login), ProtectedRoute there
      // will bounce them onward to ROLE_HOME — never a loop, at worst one
      // extra hop.
      navigate(redirectFrom ?? ROLE_HOME[user.role], { replace: true });
    } catch (err) {
      const message = getErrorMessage(err, 'Invalid email or password.');
      setFormError(message);
      toast.error(message);
    }
  };

  return (
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
        <div>
          <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            I am a
          </span>
          <div role="radiogroup" aria-label="Account type" className="grid grid-cols-2 gap-2">
            {ROLES.map((role) => (
              <label
                key={role.value}
                className={cn(
                  'cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-medium transition-colors',
                  selectedRole === role.value
                    ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800'
                )}
              >
                <input type="radio" value={role.value} className="sr-only" {...register('role')} />
                {role.label}
              </label>
            ))}
          </div>
        </div>

        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-400 dark:border-gray-600 dark:bg-gray-800"
              {...register('rememberMe')}
            />
            Remember me
          </label>
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" fullWidth loading={isSubmitting}>
          Sign in
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200 dark:border-gray-800" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-2 text-gray-400 dark:bg-gray-900 dark:text-gray-500">
            or
          </span>
        </div>
      </div>

      <Button variant="outline" fullWidth onClick={() => navigate('/guest')}>
        Continue as guest
      </Button>

      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        Don&apos;t have an account?{' '}
        <Link
          to="/signup"
          className="font-medium text-primary-600 hover:underline dark:text-primary-400"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}

export default function Login() {
  useRedirectIfAuthenticated();

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your MedAssist AI account">
      <LoginForm />
    </AuthLayout>
  );
}
