import { api } from '../api';
import type { Doctor } from '../../types/patient';

/**
 * NOTE: the backend has no general "browse/search doctors" endpoint —
 * packages/backend/src/routes/doctor.routes.ts mounts every /doctor/* route
 * behind `authorize('doctor')`, so a patient can't call it, and
 * GET /ai/doctor/:diagnosis only returns up to 5 doctors matched to a
 * symptom keyword (not a general listing). This is built against the
 * `GET /doctors` contract AppointmentBooking needs — add that route
 * (public or patient-accessible, `?search=&specialization=`) on the backend.
 */
export async function listDoctors(
  params: { search?: string; specialization?: string } = {}
): Promise<Doctor[]> {
  const { data } = await api.get<{ doctors: Doctor[] }>('/doctors', { params });
  return data.doctors;
}
