import { api } from '../api';
import type {
  PatientHistoryResponse,
  PatientNotification,
  PatientProfile,
  PatientReport,
  PatientStats,
} from '../../types/patient';

export async function getProfile(): Promise<PatientProfile> {
  const { data } = await api.get<{ profile: PatientProfile }>('/patient/profile');
  return data.profile;
}

export interface UpdateProfilePayload {
  name?: string;
  phone?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<PatientProfile> {
  const { data } = await api.put<{ profile: PatientProfile }>('/patient/profile', payload);
  return data.profile;
}

export async function getHistory(): Promise<PatientHistoryResponse> {
  const { data } = await api.get<PatientHistoryResponse>('/patient/history');
  return data;
}

export async function getReports(): Promise<PatientReport[]> {
  const { data } = await api.get<{ reports: PatientReport[] }>('/patient/reports');
  return data.reports;
}

export async function getStats(): Promise<PatientStats> {
  const { data } = await api.get<PatientStats>('/patient/stats');
  return data;
}

export async function getNotifications(): Promise<PatientNotification[]> {
  const { data } = await api.get<{ notifications: PatientNotification[] }>(
    '/patient/notifications'
  );
  return data.notifications;
}

export async function markNotificationRead(id: number): Promise<void> {
  await api.put(`/patient/notifications/${id}`);
}
