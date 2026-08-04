import { api } from '../api';
import type { FeedbackEntry } from '../../types/patient';

export interface SubmitFeedbackPayload {
  doctorId?: number;
  rating: number;
  comments?: string;
}

export interface SubmitFeedbackResult {
  feedbackId?: number;
  duplicate?: boolean;
  message: string;
}

export async function submitFeedback(
  payload: SubmitFeedbackPayload
): Promise<SubmitFeedbackResult> {
  const { data } = await api.post<{ feedbackId?: number; duplicate?: boolean; message?: string }>(
    '/feedback/submit',
    payload
  );
  return {
    feedbackId: data.feedbackId,
    duplicate: data.duplicate,
    message: data.message ?? 'Feedback submitted.',
  };
}

export async function getFeedback(id: number): Promise<FeedbackEntry> {
  const { data } = await api.get<{ feedback: FeedbackEntry }>(`/feedback/${id}`);
  return data.feedback;
}

export async function getFeedbackStats(): Promise<{
  totalFeedback: number;
  averageRating: string | null;
}> {
  const { data } = await api.get<{ totalFeedback: number; averageRating: string | null }>(
    '/feedback/stats'
  );
  return data;
}
