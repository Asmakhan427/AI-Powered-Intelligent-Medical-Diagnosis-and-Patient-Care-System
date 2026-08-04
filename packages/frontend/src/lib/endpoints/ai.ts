import { api } from '../api';
import type {
  AnalyzeSymptomsResult,
  Doctor,
  EducationArticle,
  PredictionHistoryEntry,
} from '../../types/patient';

export async function analyzeSymptoms(
  symptoms: string,
  inputType: 'TEXT' | 'VOICE' = 'TEXT'
): Promise<AnalyzeSymptomsResult> {
  const { data } = await api.post<AnalyzeSymptomsResult>('/ai/analyze', { symptoms, inputType });
  return data;
}

export async function getEducationArticle(topic: string): Promise<EducationArticle> {
  const { data } = await api.get<{ article: EducationArticle }>(
    `/ai/education/${encodeURIComponent(topic)}`
  );
  return data.article;
}

export async function getDoctorRecommendation(
  diagnosis: string
): Promise<{ specialization: string; doctors: Doctor[] }> {
  const { data } = await api.get<{ specialization: string; doctors: Doctor[] }>(
    `/ai/doctor/${encodeURIComponent(diagnosis)}`
  );
  return data;
}

export async function getPredictionHistory(): Promise<PredictionHistoryEntry[]> {
  const { data } = await api.get<{ history: PredictionHistoryEntry[] }>('/ai/history');
  return data.history;
}
