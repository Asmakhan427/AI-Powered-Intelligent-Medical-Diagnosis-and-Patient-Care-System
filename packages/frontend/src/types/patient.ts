// Shape of the raw rows/objects returned by packages/backend/src/controllers/*.
// Two casing conventions coexist on the backend: Postgres lower-folds
// unquoted identifiers (reportid, patientid, ...), while a few endpoints
// build their JSON body by hand and use camelCase (totalReports, ...).
// Each interface below matches its specific endpoint exactly rather than
// assuming a single shared convention.

export type Severity = 'MILD' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
export type ReportStatus = 'PENDING' | 'REVIEWED';
export type AppointmentStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface PatientStats {
  totalReports: number;
  totalAppointments: number;
  pendingReports: number;
  emergencyCount: number;
  severityScore: Severity;
}

export interface PatientNotification {
  notificationid: number;
  message: string;
  sent_at: string;
  is_read: boolean;
}

export interface PatientReport {
  reportid: number;
  symptoms: string;
  ai_diagnosis: string;
  ai_confidence: number;
  status: ReportStatus;
  doctor_notes: string | null;
  prescription: string | null;
  doctor_diagnosis?: string | null;
  created_date: string;
  doctorid: number | null;
  doctor_name: string | null;
  specialization: string | null;
}

export interface MedicalHistoryEntry {
  historyid: number;
  history_text: string;
  recorded_date: string;
}

export interface PatientAppointment {
  slotid: number;
  appointment_date: string;
  appointment_time: string;
  status: AppointmentStatus;
  reason: string | null;
  doctor_name: string;
  specialization: string;
}

export interface PatientProfile {
  patientid: number;
  name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  blood_group: string | null;
  created_at?: string;
  last_appointment_date?: string | null;
}

export interface PatientHistoryResponse {
  patient: { patientid: number; name: string; email: string; phone: string | null };
  history: MedicalHistoryEntry[];
  reports: PatientReport[];
  appointments: PatientAppointment[];
}

export interface PredictionDifferential {
  disease: string;
  confidence: number;
}

export interface AnalyzeSymptomsResult {
  diagnosis: string;
  confidence: number;
  emergencyDetected: boolean;
  severity: Severity;
  description: string | null;
  recommendations: string;
  differentials: PredictionDifferential[];
  symptomsDetected: string[];
  assignedDoctor: string;
  doctorReason: string;
  assignedDoctorId: number | null;
  reportId: number | null;
  responseTime: number;
}

export interface PredictionHistoryEntry {
  logid: number;
  symptoms_input: string;
  input_type: 'TEXT' | 'VOICE';
  ai_response: string;
  severity: Severity;
  log_timestamp: string;
}

export interface EducationArticle {
  title: string;
  text: string;
  image: string;
  precautions: string;
}

export interface Doctor {
  doctorid: number;
  name: string;
  specialization: string;
  consultation_fee: number;
  is_available: boolean;
  experience_years?: number;
}

export interface FeedbackEntry {
  feedbackid: number;
  patientid: number;
  doctorid: number | null;
  rating: number;
  comments: string | null;
  created_at: string;
  patient_name: string;
  doctor_name: string | null;
}
