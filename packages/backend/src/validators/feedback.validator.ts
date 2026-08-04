import { z } from 'zod';

export const submitFeedbackSchema = z.object({
  doctorId: z.coerce.number().int().positive().optional(),
  rating: z.coerce.number().int().min(1, 'Rating must be between 1 and 5').max(5),
  comments: z.string().trim().max(2000).optional(),
});
export type SubmitFeedbackInput = z.infer<typeof submitFeedbackSchema>;

export const feedbackIdParamSchema = z.object({
  id: z.coerce.number().int().positive('Invalid feedback id'),
});
