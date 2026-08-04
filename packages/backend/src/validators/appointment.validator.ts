import { z } from 'zod';

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');
const timeStr = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:MM');

export const availableSlotsQuerySchema = z.object({
  doctorId: z.coerce.number().int().positive(),
  date: dateStr,
});
export type AvailableSlotsQuery = z.infer<typeof availableSlotsQuerySchema>;

export const bookAppointmentSchema = z.object({
  doctorId: z.coerce.number().int().positive(),
  date: dateStr,
  time: timeStr,
  reason: z.string().trim().max(500).optional(),
});
export type BookAppointmentInput = z.infer<typeof bookAppointmentSchema>;

export const appointmentIdParamSchema = z.object({
  id: z.coerce.number().int().positive('Invalid appointment id'),
});

export const cancelAppointmentSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
});
export type UpdateAppointmentStatusInput = z.infer<typeof updateAppointmentStatusSchema>;
