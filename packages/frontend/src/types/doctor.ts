// Matches packages/backend/src/controllers/doctor.controller.ts response
// shapes exactly — same lowercase-pg-column vs hand-built-camelCase split
// as types/patient.ts.
import type { AppointmentStatus, ReportStatus } from './patient';

export interface DoctorProfileData {
  doctorid: number;
  name: string;
  email: string;
  specialization: string;
  experience_years: number;
  consultation_fee: number;
  is_available: boolean;
}

export interface DoctorPendingReport {
  reportid: number;
  patientid: number;
  symptoms: string;
  ai_diagnosis: string;
  ai_confidence: number;
  status: ReportStatus;
  created_at: string;
  patient_name: string;
}

export interface DoctorReviewedReport {
  reportid: number;
  patientid: number;
  symptoms: string;
  ai_diagnosis: string;
  ai_confidence: number;
  status: ReportStatus;
  created_date: string;
  reviewed_at: string;
  patient_name: string;
  doctor_notes: string | null;
  prescription: string | null;
  doctor_diagnosis: string | null;
}

export interface DoctorAppointment {
  slotid: number;
  appointment_date: string;
  appointment_time: string;
  status: AppointmentStatus;
  reason?: string | null;
  patientid: number;
  patient_name: string;
  phone: string | null;
}

export interface DoctorStats {
  pending: number;
  reviewed: number;
  upcomingAppointments: number;
}

export interface WorkingHours {
  start: string;
  end: string;
}

export type WeekDay = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

/**
 * A patient roster entry the way a doctor sees it — derived client-side
 * from that doctor's own reports/appointments (no backend endpoint returns
 * this shape directly). See lib/endpoints/doctorPatients.ts.
 */
export interface DoctorPatientSummary {
  patientid: number;
  name: string;
  phone: string | null;
  lastInteraction: string;
}
