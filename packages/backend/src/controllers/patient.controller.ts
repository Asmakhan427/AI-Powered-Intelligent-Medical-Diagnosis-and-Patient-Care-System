import { Request, Response } from 'express';
import { query } from '../config/db';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { UpdatePatientProfileInput } from '../validators/patient.validator';

function patientId(req: Request): number {
  if (!req.user || req.user.role !== 'patient')
    throw ApiError.forbidden('Patient account required');
  return Number(req.user.id);
}

/**
 * GET /api/v1/patient/profile (protected)
 */
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const id = patientId(req);
  const result = await query(
    `SELECT patientID, name, email, phone, date_of_birth, blood_group, created_at, last_appointment_date
     FROM Patient WHERE patientID = $1`,
    [id]
  );
  if (!result.rows.length) throw ApiError.notFound('Patient not found');
  sendSuccess(res, 200, { profile: result.rows[0] });
});

/**
 * PUT /api/v1/patient/profile (protected)
 */
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const id = patientId(req);
  const { name, phone, dateOfBirth, bloodGroup } = req.body as UpdatePatientProfileInput;

  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (name !== undefined) {
    fields.push(`name = $${i++}`);
    values.push(name);
  }
  if (phone !== undefined) {
    fields.push(`phone = $${i++}`);
    values.push(phone);
  }
  if (dateOfBirth !== undefined) {
    fields.push(`date_of_birth = $${i++}`);
    values.push(dateOfBirth);
  }
  if (bloodGroup !== undefined) {
    fields.push(`blood_group = $${i++}`);
    values.push(bloodGroup);
  }

  values.push(id);

  const result = await query(
    `UPDATE Patient SET ${fields.join(', ')} WHERE patientID = $${i} RETURNING patientID, name, email, phone, date_of_birth, blood_group`,
    values
  );

  if (!result.rows.length) throw ApiError.notFound('Patient not found');
  sendSuccess(res, 200, { profile: result.rows[0] }, 'Profile updated successfully');
});

/**
 * GET /api/v1/patient/history (protected)
 * Full medical history: history log entries, reports, appointments.
 */
export const getHistory = asyncHandler(async (req: Request, res: Response) => {
  const id = patientId(req);

  const [patientResult, historyResult, reportsResult, appointmentsResult] = await Promise.all([
    query('SELECT patientID, name, email, phone FROM Patient WHERE patientID = $1', [id]),
    query(
      `SELECT historyID, history_text, TO_CHAR(recorded_date, 'YYYY-MM-DD') as recorded_date
       FROM MedicalHistory WHERE patientID = $1 ORDER BY recorded_date DESC`,
      [id]
    ),
    query(
      `SELECT r.reportID, r.symptoms, r.ai_diagnosis, r.ai_confidence, r.status, r.doctor_notes, r.prescription,
              TO_CHAR(r.created_at, 'YYYY-MM-DD') as created_date, r.doctorID, d.name as doctor_name, d.specialization
       FROM Report r LEFT JOIN Doctor d ON r.doctorID = d.doctorID
       WHERE r.patientID = $1 ORDER BY r.created_at DESC`,
      [id]
    ),
    query(
      `SELECT a.slotID, TO_CHAR(a.appointment_date, 'YYYY-MM-DD') as appointment_date, a.appointment_time, a.status, d.name as doctor_name
       FROM AppointmentSlot a JOIN Doctor d ON a.doctorID = d.doctorID
       WHERE a.patientID = $1 ORDER BY a.appointment_date DESC`,
      [id]
    ),
  ]);

  if (!patientResult.rows.length) throw ApiError.notFound('Patient not found');

  sendSuccess(res, 200, {
    patient: patientResult.rows[0],
    history: historyResult.rows,
    reports: reportsResult.rows,
    appointments: appointmentsResult.rows,
  });
});

/**
 * GET /api/v1/patient/reports (protected)
 * Reports list only (lighter than /history for the reports tab).
 */
export const getReports = asyncHandler(async (req: Request, res: Response) => {
  const id = patientId(req);
  const result = await query(
    `SELECT r.reportID, r.symptoms, r.ai_diagnosis, r.ai_confidence, r.status, r.doctor_notes, r.prescription,
            TO_CHAR(r.created_at, 'YYYY-MM-DD') as created_date, r.doctorID, d.name as doctor_name, d.specialization
     FROM Report r LEFT JOIN Doctor d ON r.doctorID = d.doctorID
     WHERE r.patientID = $1 ORDER BY r.created_at DESC`,
    [id]
  );
  sendSuccess(res, 200, { reports: result.rows });
});

/**
 * GET /api/v1/patient/stats (protected)
 */
export const getStats = asyncHandler(async (req: Request, res: Response) => {
  const id = patientId(req);

  const [reports, appointments, pendingReports, emergencies, severity] = await Promise.all([
    query<{ count: string }>(
      'SELECT COUNT(DISTINCT reportID) as count FROM Report WHERE patientID = $1',
      [id]
    ),
    query<{ count: string }>(
      'SELECT COUNT(DISTINCT slotID) as count FROM AppointmentSlot WHERE patientID = $1',
      [id]
    ),
    query<{ count: string }>(
      "SELECT COUNT(DISTINCT reportID) as count FROM Report WHERE patientID = $1 AND status = 'PENDING'",
      [id]
    ),
    query<{ count: string }>('SELECT COUNT(*) as count FROM EmergencyAlert WHERE patientID = $1', [
      id,
    ]),
    query<{ severity: string }>('SELECT fn_CalculateSeverityScore($1) as severity', [id]),
  ]);

  sendSuccess(res, 200, {
    totalReports: Number(reports.rows[0]?.count ?? 0),
    totalAppointments: Number(appointments.rows[0]?.count ?? 0),
    pendingReports: Number(pendingReports.rows[0]?.count ?? 0),
    emergencyCount: Number(emergencies.rows[0]?.count ?? 0),
    severityScore: severity.rows[0]?.severity ?? 'MILD',
  });
});

/**
 * GET /api/v1/patient/notifications (protected)
 */
export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const id = patientId(req);
  const result = await query(
    `SELECT notificationID, message, TO_CHAR(sent_at, 'YYYY-MM-DD HH24:MI') as sent_at, is_read
     FROM NotificationLog WHERE patientID = $1 ORDER BY sent_at DESC`,
    [id]
  );
  sendSuccess(res, 200, { notifications: result.rows });
});

/**
 * PUT /api/v1/patient/notifications/:id (protected)
 */
export const markNotificationRead = asyncHandler(async (req: Request, res: Response) => {
  const id = patientId(req);
  const notificationId = Number(req.params.id);

  const result = await query(
    'UPDATE NotificationLog SET is_read = true WHERE notificationID = $1 AND patientID = $2 RETURNING notificationID',
    [notificationId, id]
  );

  if (!result.rows.length) throw ApiError.notFound('Notification not found');
  sendSuccess(res, 200, {}, 'Notification marked as read');
});
