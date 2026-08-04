import { Request, Response } from 'express';
import { query } from '../config/db';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import {
  AddPatientNoteInput,
  ReviewReportInput,
  UpdateAvailabilityInput,
  UpdateDoctorProfileInput,
} from '../validators/doctor.validator';

function doctorId(req: Request): number {
  if (!req.user || req.user.role !== 'doctor') throw ApiError.forbidden('Doctor account required');
  return Number(req.user.id);
}

/**
 * There's no `GET /doctor/patients` listing endpoint on purpose (a doctor
 * shouldn't be able to browse the entire patient table) — the frontend
 * derives its roster client-side from reports/appointments it already
 * fetched (see lib/endpoints/doctorPatients.ts's derivePatientRoster).
 * That's a client-side-only filter unless enforced here too, so every
 * doctor/patients/:id route checks this before returning anything.
 */
async function assertTreatmentRelationship(doctorIdVal: number, patientIdVal: number): Promise<void> {
  const relationship = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM (
       SELECT 1 FROM Report WHERE doctorID = $1 AND patientID = $2
       UNION ALL
       SELECT 1 FROM AppointmentSlot WHERE doctorID = $1 AND patientID = $2
     ) t`,
    [doctorIdVal, patientIdVal]
  );
  if (Number(relationship.rows[0].count) === 0) {
    throw ApiError.forbidden('You do not have a treatment relationship with this patient');
  }
}

/**
 * GET /api/v1/doctors?search=&specialization= (public)
 * Browsing/searching available doctors — distinct from /api/v1/doctor/*,
 * which is a doctor's own profile management and requires that role, so a
 * patient can never call it. Mounted separately in routes/doctors.routes.ts.
 */
export const listDoctors = asyncHandler(async (req: Request, res: Response) => {
  const { search, specialization } = req.query as { search?: string; specialization?: string };

  const conditions: string[] = ['is_available = true'];
  const values: unknown[] = [];
  let i = 1;

  if (search) {
    conditions.push(`name ILIKE $${i++}`);
    values.push(`%${search}%`);
  }
  if (specialization) {
    conditions.push(`specialization = $${i++}`);
    values.push(specialization);
  }

  const result = await query(
    `SELECT doctorID, name, specialization, consultation_fee, is_available, experience_years
     FROM Doctor WHERE ${conditions.join(' AND ')} ORDER BY name`,
    values
  );

  sendSuccess(res, 200, { doctors: result.rows });
});

/**
 * GET /api/v1/doctor/profile (protected, doctor)
 */
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const id = doctorId(req);
  const result = await query(
    `SELECT doctorID, name, email, specialization, experience_years, consultation_fee, is_available
     FROM Doctor WHERE doctorID = $1`,
    [id]
  );
  if (!result.rows.length) throw ApiError.notFound('Doctor not found');
  sendSuccess(res, 200, { profile: result.rows[0] });
});

/**
 * PUT /api/v1/doctor/profile (protected, doctor)
 */
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const id = doctorId(req);
  const { name, specialization, experienceYears, consultationFee } =
    req.body as UpdateDoctorProfileInput;

  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (name !== undefined) {
    fields.push(`name = $${i++}`);
    values.push(name);
  }
  if (specialization !== undefined) {
    fields.push(`specialization = $${i++}`);
    values.push(specialization);
  }
  if (experienceYears !== undefined) {
    fields.push(`experience_years = $${i++}`);
    values.push(experienceYears);
  }
  if (consultationFee !== undefined) {
    fields.push(`consultation_fee = $${i++}`);
    values.push(consultationFee);
  }

  values.push(id);

  const result = await query(
    `UPDATE Doctor SET ${fields.join(', ')} WHERE doctorID = $${i}
     RETURNING doctorID, name, specialization, experience_years, consultation_fee, is_available`,
    values
  );

  if (!result.rows.length) throw ApiError.notFound('Doctor not found');
  sendSuccess(res, 200, { profile: result.rows[0] }, 'Profile updated successfully');
});

/**
 * GET /api/v1/doctor/reports/pending (protected, doctor)
 */
export const getPendingReports = asyncHandler(async (req: Request, res: Response) => {
  const id = doctorId(req);
  const result = await query(
    `SELECT r.reportID, r.patientID, r.symptoms, r.ai_diagnosis, r.ai_confidence, r.status,
            TO_CHAR(r.created_at, 'YYYY-MM-DD HH24:MI') as created_at, p.name as patient_name
     FROM Report r JOIN Patient p ON r.patientID = p.patientID
     WHERE r.status = 'PENDING' AND r.doctorID = $1
     ORDER BY r.created_at DESC`,
    [id]
  );
  sendSuccess(res, 200, { reports: result.rows });
});

/**
 * GET /api/v1/doctor/reports/reviewed (protected, doctor)
 */
export const getReviewedReports = asyncHandler(async (req: Request, res: Response) => {
  const id = doctorId(req);
  const result = await query(
    `SELECT r.reportID, r.patientID, r.symptoms, r.ai_diagnosis, r.ai_confidence, r.status,
            TO_CHAR(r.created_at, 'YYYY-MM-DD') as created_date,
            TO_CHAR(r.reviewed_at, 'YYYY-MM-DD HH24:MI') as reviewed_at,
            p.name as patient_name, r.doctor_notes, r.prescription, r.doctor_diagnosis
     FROM Report r JOIN Patient p ON r.patientID = p.patientID
     WHERE r.doctorID = $1 AND r.status = 'REVIEWED'
     ORDER BY r.reviewed_at DESC`,
    [id]
  );
  sendSuccess(res, 200, { reports: result.rows });
});

/**
 * POST /api/v1/doctor/reviews (protected, doctor)
 */
export const reviewReport = asyncHandler(async (req: Request, res: Response) => {
  const id = doctorId(req);
  const { reportId, notes, prescription, doctorDiagnosis } = req.body as ReviewReportInput;

  const check = await query<{ patientid: number }>(
    'SELECT patientID FROM Report WHERE reportID = $1',
    [reportId]
  );
  if (!check.rows.length) throw ApiError.notFound('Report not found');

  const reviewedPatientId = check.rows[0].patientid;

  await query(
    `UPDATE Report SET doctorID = $1, doctor_notes = $2, prescription = $3, doctor_diagnosis = $4,
       status = 'REVIEWED', reviewed_at = CURRENT_TIMESTAMP
     WHERE reportID = $5`,
    [id, notes ?? null, prescription ?? null, doctorDiagnosis ?? null, reportId]
  );

  await query(
    `INSERT INTO MedicalHistory (patientID, history_text, recorded_date) VALUES ($1, $2, CURRENT_TIMESTAMP)`,
    [
      reviewedPatientId,
      `Report #${reportId} reviewed by Doctor. Diagnosis: ${doctorDiagnosis || notes || 'Reviewed'} | Prescription: ${prescription || 'None'}`,
    ]
  );

  await query(
    `INSERT INTO NotificationLog (patientID, message, sent_at) VALUES ($1, $2, CURRENT_TIMESTAMP)`,
    [
      reviewedPatientId,
      `Your report #${reportId} has been reviewed by a doctor. Please check your medical history.`,
    ]
  );

  sendSuccess(res, 200, { reportId }, 'Report reviewed successfully');
});

/**
 * GET /api/v1/doctor/appointments (protected, doctor)
 */
export const getAppointments = asyncHandler(async (req: Request, res: Response) => {
  const id = doctorId(req);
  const result = await query(
    `SELECT a.slotID, TO_CHAR(a.appointment_date, 'YYYY-MM-DD') as appointment_date, a.appointment_time, a.status,
            p.patientID, p.name as patient_name, p.phone
     FROM AppointmentSlot a JOIN Patient p ON a.patientID = p.patientID
     WHERE a.doctorID = $1 ORDER BY a.appointment_date DESC`,
    [id]
  );
  sendSuccess(res, 200, { appointments: result.rows });
});

/**
 * PUT /api/v1/doctor/availability (protected, doctor)
 * Note: availableDays / workingHours are accepted for forward-compatibility
 * with a future DoctorAvailability table; only is_available is persisted
 * against the current schema.
 */
export const updateAvailability = asyncHandler(async (req: Request, res: Response) => {
  const id = doctorId(req);
  const { isAvailable } = req.body as UpdateAvailabilityInput;

  const result = await query(
    'UPDATE Doctor SET is_available = $1 WHERE doctorID = $2 RETURNING doctorID, is_available',
    [isAvailable, id]
  );

  if (!result.rows.length) throw ApiError.notFound('Doctor not found');
  sendSuccess(res, 200, { availability: result.rows[0] }, 'Availability updated');
});

/**
 * GET /api/v1/doctor/stats (protected, doctor)
 */
export const getStats = asyncHandler(async (req: Request, res: Response) => {
  const id = doctorId(req);
  const [pending, reviewed, upcomingAppointments] = await Promise.all([
    query<{ count: string }>(
      "SELECT COUNT(*) as count FROM Report WHERE doctorID = $1 AND status = 'PENDING'",
      [id]
    ),
    query<{ count: string }>(
      "SELECT COUNT(*) as count FROM Report WHERE doctorID = $1 AND status = 'REVIEWED'",
      [id]
    ),
    query<{ count: string }>(
      "SELECT COUNT(*) as count FROM AppointmentSlot WHERE doctorID = $1 AND status = 'SCHEDULED' AND appointment_date >= CURRENT_DATE",
      [id]
    ),
  ]);

  sendSuccess(res, 200, {
    pending: Number(pending.rows[0]?.count ?? 0),
    reviewed: Number(reviewed.rows[0]?.count ?? 0),
    upcomingAppointments: Number(upcomingAppointments.rows[0]?.count ?? 0),
  });
});

/**
 * GET /api/v1/doctor/patients/:id (protected, doctor)
 * Only for a patient this doctor actually has a report or appointment
 * with — see assertTreatmentRelationship above.
 */
export const getPatientDetail = asyncHandler(async (req: Request, res: Response) => {
  const id = doctorId(req);
  const patientIdParam = Number(req.params.id);

  await assertTreatmentRelationship(id, patientIdParam);

  const [profileResult, historyResult] = await Promise.all([
    query(
      `SELECT patientID, name, email, phone, date_of_birth, blood_group, created_at, last_appointment_date
       FROM Patient WHERE patientID = $1`,
      [patientIdParam]
    ),
    query(
      `SELECT historyID, history_text, TO_CHAR(recorded_date, 'YYYY-MM-DD') as recorded_date
       FROM MedicalHistory WHERE patientID = $1 ORDER BY recorded_date DESC`,
      [patientIdParam]
    ),
  ]);

  if (!profileResult.rows.length) throw ApiError.notFound('Patient not found');

  sendSuccess(res, 200, { profile: profileResult.rows[0], history: historyResult.rows });
});

/**
 * POST /api/v1/doctor/patients/:id/notes (protected, doctor)
 * Appends to the patient's MedicalHistory log — the same append-only
 * activity log every other patient-facing event writes to (appointment
 * booked/cancelled, report reviewed, etc.) — tagged so it reads clearly as
 * a doctor's note rather than a system-generated entry when the patient
 * views their own history.
 */
export const addPatientNote = asyncHandler(async (req: Request, res: Response) => {
  const id = doctorId(req);
  const patientIdParam = Number(req.params.id);
  const { note } = req.body as AddPatientNoteInput;

  await assertTreatmentRelationship(id, patientIdParam);

  const doctorRow = await query<{ name: string }>('SELECT name FROM Doctor WHERE doctorID = $1', [
    id,
  ]);
  const doctorName = doctorRow.rows[0]?.name ?? 'your doctor';

  await query(
    'INSERT INTO MedicalHistory (patientID, history_text, recorded_date) VALUES ($1, $2, CURRENT_TIMESTAMP)',
    [patientIdParam, `📝 Note from Dr. ${doctorName}: ${note}`]
  );

  sendSuccess(res, 201, {}, 'Note added successfully');
});
