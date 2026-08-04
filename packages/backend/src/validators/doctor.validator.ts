import { z } from 'zod';

export const updateDoctorProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    specialization: z.string().trim().min(2).max(100).optional(),
    experienceYears: z.coerce.number().int().min(0).max(70).optional(),
    consultationFee: z.coerce.number().min(0).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided to update',
  });
export type UpdateDoctorProfileInput = z.infer<typeof updateDoctorProfileSchema>;

export const reviewReportSchema = z.object({
  reportId: z.coerce.number().int().positive(),
  notes: z.string().trim().max(4000).optional(),
  prescription: z.string().trim().max(4000).optional(),
  doctorDiagnosis: z.string().trim().max(255).optional(),
});
export type ReviewReportInput = z.infer<typeof reviewReportSchema>;

export const updateAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
  availableDays: z.array(z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'])).optional(),
  workingHours: z
    .object({
      start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:MM'),
      end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:MM'),
    })
    .optional(),
});
export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilitySchema>;

export const addPatientNoteSchema = z.object({
  note: z.string().trim().min(1).max(2000),
});
export type AddPatientNoteInput = z.infer<typeof addPatientNoteSchema>;

export const patientIdParamSchema = z.object({
  id: z.coerce.number().int().positive('Invalid patient id'),
});
