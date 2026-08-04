import { z } from 'zod';

export const updatePatientProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    phone: z.string().trim().max(20).optional(),
    dateOfBirth: z.string().date().optional(),
    bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided to update',
  });
export type UpdatePatientProfileInput = z.infer<typeof updatePatientProfileSchema>;

export const notificationIdParamSchema = z.object({
  id: z.coerce.number().int().positive('Invalid notification id'),
});
