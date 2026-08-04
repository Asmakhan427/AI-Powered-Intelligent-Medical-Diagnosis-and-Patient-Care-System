import { z } from 'zod';

// Kept in sync with packages/backend/src/validators/auth.validator.ts —
// the client should never be stricter than what the API will actually accept.

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  role: z.enum(['patient', 'doctor']),
  rememberMe: z.boolean(),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

// Password-matching is intersected in rather than chained as a top-level
// `.refine()` on the full object. Zod only runs an object's refinements
// after every field in that SAME object passes its own check — so a
// `.refine()` covering all of signupSchema would get silently skipped
// whenever `acceptTerms` (or any other field) was also invalid, hiding the
// "passwords don't match" error behind unrelated ones. Splitting the
// password pair into its own refined schema and intersecting it with the
// rest keeps both checks independent, so both errors always surface.
const passwordPairSchema = z
  .object({
    password: z.string().min(6, 'Password must be at least 6 characters').max(72),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const signupDetailsSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[0-9+\-\s()]*$/, 'Enter a valid phone number')
    .optional()
    .or(z.literal('')),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the Terms of Service to continue' }),
  }),
});

export const signupSchema = z.intersection(signupDetailsSchema, passwordPairSchema);
export type SignupFormValues = z.infer<typeof signupSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
});
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z.string().min(6, 'Password must be at least 6 characters').max(72),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
