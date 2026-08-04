import { z } from 'zod';

export const analyzeSymptomsSchema = z.object({
  symptoms: z.string().trim().min(3, 'Please describe your symptoms in more detail').max(2000),
  patientId: z.union([z.coerce.number().int().positive(), z.null()]).optional(),
  inputType: z.enum(['TEXT', 'VOICE']).default('TEXT'),
});
export type AnalyzeSymptomsInput = z.infer<typeof analyzeSymptomsSchema>;

export const educationTopicParamSchema = z.object({
  topic: z.string().trim().toLowerCase().min(2).max(50),
});

export const doctorRecommendationParamSchema = z.object({
  diagnosis: z.string().trim().min(2).max(255),
});
