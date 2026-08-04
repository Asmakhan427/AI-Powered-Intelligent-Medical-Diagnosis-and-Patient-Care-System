import { api } from '../api';
import type {
  DoctorAppointment,
  DoctorPatientSummary,
  DoctorPendingReport,
  DoctorReviewedReport,
} from '../../types/doctor';
import type { MedicalHistoryEntry, PatientProfile } from '../../types/patient';

/**
 * Builds "my patients" from data the doctor already has access to (their
 * own reports + appointments) — there's no `GET /doctor/patients` listing
 * endpoint, and a doctor shouldn't be able to search the entire patient
 * table anyway, so this is scoped to patients they actually have a
 * relationship with.
 */
export function derivePatientRoster(
  pendingReports: DoctorPendingReport[],
  reviewedReports: DoctorReviewedReport[],
  appointments: DoctorAppointment[]
): DoctorPatientSummary[] {
  const byId = new Map<number, DoctorPatientSummary>();

  const upsert = (patientid: number, name: string, phone: string | null, when: string) => {
    const existing = byId.get(patientid);
    if (!existing || when > existing.lastInteraction) {
      byId.set(patientid, {
        patientid,
        name,
        phone: phone ?? existing?.phone ?? null,
        lastInteraction: when,
      });
    }
  };

  for (const r of pendingReports) upsert(r.patientid, r.patient_name, null, r.created_at);
  for (const r of reviewedReports) upsert(r.patientid, r.patient_name, null, r.created_date);
  for (const a of appointments) upsert(a.patientid, a.patient_name, a.phone, a.appointment_date);

  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * NOTE: no backend endpoint exposes a patient's profile/general medical
 * history to their doctor — patient.routes.ts is entirely
 * `authorize('patient')`-gated (patients can only read their own record).
 * A doctor's own reports/appointments for that patient (real data, no gap)
 * are fetched separately by filtering what getPendingReports/
 * getReviewedReports/getAppointments already return. This function is
 * built against the `GET /doctor/patients/:id` contract that gap needs.
 */
export async function getPatientDetail(
  patientId: number
): Promise<{ profile: PatientProfile; history: MedicalHistoryEntry[] }> {
  const { data } = await api.get<{ profile: PatientProfile; history: MedicalHistoryEntry[] }>(
    `/doctor/patients/${patientId}`
  );
  return data;
}

/**
 * NOTE: also not implemented on the backend — built against a
 * `POST /doctor/patients/:id/notes` contract. Kept separate from report
 * review notes (`doctor_notes` on a specific Report) since a general
 * patient note isn't tied to any one report.
 */
export async function addPatientNote(patientId: number, note: string): Promise<void> {
  await api.post(`/doctor/patients/${patientId}/notes`, { note });
}
