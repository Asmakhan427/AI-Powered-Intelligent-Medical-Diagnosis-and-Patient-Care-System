import { api } from '../api';
import type {
  DoctorAppointment,
  DoctorPendingReport,
  DoctorProfileData,
  DoctorReviewedReport,
  DoctorStats,
  WeekDay,
  WorkingHours,
} from '../../types/doctor';

export async function getProfile(): Promise<DoctorProfileData> {
  const { data } = await api.get<{ profile: DoctorProfileData }>('/doctor/profile');
  return data.profile;
}

export interface UpdateDoctorProfilePayload {
  name?: string;
  specialization?: string;
  experienceYears?: number;
  consultationFee?: number;
}

export async function updateProfile(
  payload: UpdateDoctorProfilePayload
): Promise<DoctorProfileData> {
  const { data } = await api.put<{ profile: DoctorProfileData }>('/doctor/profile', payload);
  return data.profile;
}

export async function getPendingReports(): Promise<DoctorPendingReport[]> {
  const { data } = await api.get<{ reports: DoctorPendingReport[] }>('/doctor/reports/pending');
  return data.reports;
}

export async function getReviewedReports(): Promise<DoctorReviewedReport[]> {
  const { data } = await api.get<{ reports: DoctorReviewedReport[] }>('/doctor/reports/reviewed');
  return data.reports;
}

export interface ReviewReportPayload {
  reportId: number;
  notes?: string;
  prescription?: string;
  doctorDiagnosis?: string;
}

export async function reviewReport(payload: ReviewReportPayload): Promise<void> {
  await api.post('/doctor/reviews', payload);
}

export async function getAppointments(): Promise<DoctorAppointment[]> {
  const { data } = await api.get<{ appointments: DoctorAppointment[] }>('/doctor/appointments');
  return data.appointments;
}

export interface UpdateAvailabilityPayload {
  isAvailable: boolean;
  /**
   * Accepted by the validator for forward-compatibility but not yet
   * persisted server-side (see doctor.controller.ts's updateAvailability —
   * only isAvailable is written to the DB today).
   */
  availableDays?: WeekDay[];
  workingHours?: WorkingHours;
}

export async function updateAvailability(
  payload: UpdateAvailabilityPayload
): Promise<{ doctorid: number; is_available: boolean }> {
  const { data } = await api.put<{ availability: { doctorid: number; is_available: boolean } }>(
    '/doctor/availability',
    payload
  );
  return data.availability;
}

export async function getStats(): Promise<DoctorStats> {
  const { data } = await api.get<DoctorStats>('/doctor/stats');
  return data;
}
