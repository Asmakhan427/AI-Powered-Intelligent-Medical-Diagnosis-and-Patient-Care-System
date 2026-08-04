import { z } from 'zod';

export const signupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().email('Invalid email address').max(100),
  phone: z.string().trim().max(20).optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').max(72),
  dateOfBirth: z.string().date().optional(),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']).optional(),
});
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  role: z.enum(['patient', 'doctor']).default('patient'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(10, 'refreshToken is required'),
});
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
