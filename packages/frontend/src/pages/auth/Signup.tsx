import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Button, Input, useToast } from '../../components/common';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { getErrorMessage, useAuth, useRedirectIfAuthenticated } from '../../context/AuthContext';
import { signupSchema, type SignupFormValues } from './authSchemas';

function SignupForm() {
  const { signup } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      acceptTerms: undefined,
    },
  });

  const onSubmit = async (values: SignupFormValues) => {
    setFormError(null);
    try {
      const user = await signup(
        {
          name: values.name,
          email: values.email,
          phone: values.phone || undefined,
          password: values.password,
        },
        true
      );
      toast.success(`Welcome to MedAssist AI, ${user.name}!`);
      navigate('/', { replace: true });
    } catch (err) {
      const message = getErrorMessage(err, 'Could not create your account.');
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
        <Input
          label="Full name"
          placeholder="Jane Doe"
          required
          error={errors.name?.message}
          {...register('name')}
        />

        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          required
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Phone"
          type="tel"
          placeholder="+1 555 123 4567"
          helperText="Optional"
          error={errors.phone?.message}
          {...register('phone')}
        />

        <Input
          label="Password"
          type="password"
          placeholder="At least 6 characters"
          required
          error={errors.password?.message}
          {...register('password')}
        />

        <Input
          label="Confirm password"
          type="password"
          placeholder="••••••••"
          required
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <div>
          <label className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-400 dark:border-gray-600 dark:bg-gray-800"
              {...register('acceptTerms')}
            />
            <span>
              I agree to the{' '}
              <Link
                to="/terms"
                target="_blank"
                className="font-medium text-primary-600 hover:underline dark:text-primary-400"
              >
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link
                to="/privacy"
                target="_blank"
                className="font-medium text-primary-600 hover:underline dark:text-primary-400"
              >
                Privacy Policy
              </Link>
            </span>
          </label>
          {errors.acceptTerms && (
            <p role="alert" className="mt-1.5 text-sm text-red-600 dark:text-red-400">
              {errors.acceptTerms.message}
            </p>
          )}
        </div>

        <Button type="submit" fullWidth loading={isSubmitting}>
          Create account
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-medium text-primary-600 hover:underline dark:text-primary-400"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function Signup() {
  useRedirectIfAuthenticated();

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Patient accounts only — doctor accounts are provisioned by staff"
    >
      <SignupForm />
    </AuthLayout>
  );
}
