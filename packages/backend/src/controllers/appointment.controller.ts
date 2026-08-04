import { Request, Response } from 'express';
import { query } from '../config/db';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import {
  BookAppointmentInput,
  UpdateAppointmentStatusInput,
} from '../validators/appointment.validator';

/** Standard 30-minute consultation slots, 09:00 - 17:00. */
const DAILY_TIME_SLOTS: string[] = Array.from({ length: 16 }, (_, i) => {
  const totalMinutes = 9 * 60 + i * 30;
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const m = String(totalMinutes % 60).padStart(2, '0');
  return `${h}:${m}`;
});

function requirePatientId(req: Request): number {
  if (!req.user || req.user.role !== 'patient')
    throw ApiError.forbidden('Patient account required');
  return Number(req.user.id);
}

function requireDoctorId(req: Request): number {
  if (!req.user || req.user.role !== 'doctor') throw ApiError.forbidden('Doctor account required');
  return Number(req.user.id);
}

/**
 * GET /api/v1/appointments/available-slots?doctorId=&date= (public)
 */
export const getAvailableSlots = asyncHandler(async (req: Request, res: Response) => {
  const doctorId = Number(req.query.doctorId);
  const date = String(req.query.date);

  const doctorCheck = await query<{ is_available: boolean }>(
    'SELECT is_available FROM Doctor WHERE doctorID = $1',
    [doctorId]
  );
  if (!doctorCheck.rows.length) throw ApiError.notFound('Doctor not found');

  const booked = await query<{ appointment_time: string }>(
    `SELECT appointment_time FROM AppointmentSlot
     WHERE doctorID = $1 AND appointment_date = $2 AND status != 'CANCELLED'`,
    [doctorId, date]
  );
  const bookedTimes = new Set(booked.rows.map((r) => r.appointment_time));

  const availableSlots = doctorCheck.rows[0].is_available
    ? DAILY_TIME_SLOTS.filter((t) => !bookedTimes.has(t))
    : [];

  sendSuccess(res, 200, { availableSlots, bookedSlots: Array.from(bookedTimes) });
});

/**
 * POST /api/v1/appointments/book (protected)
 */
export const bookAppointment = asyncHandler(async (req: Request, res: Response) => {
  const patientId = requirePatientId(req);
  const { doctorId, date, time, reason } = req.body as BookAppointmentInput;

  const doctorCheck = await query<{ doctorid: number; name: string; is_available: boolean }>(
    'SELECT doctorID, name, is_available FROM Doctor WHERE doctorID = $1',
    [doctorId]
  );
  if (!doctorCheck.rows.length) throw ApiError.notFound('Doctor not found');
  if (!doctorCheck.rows[0].is_available)
    throw ApiError.badRequest('Doctor is currently not available');

  const slotCheck = await query(
    `SELECT slotID FROM AppointmentSlot
     WHERE doctorID = $1 AND appointment_date = $2 AND appointment_time = $3 AND status != 'CANCELLED'`,
    [doctorId, date, time]
  );
  if (slotCheck.rows.length)
    throw ApiError.conflict('This time slot is already booked. Please select another time.');

  const inserted = await query<{ slotid: number }>(
    `INSERT INTO AppointmentSlot (doctorID, patientID, appointment_date, appointment_time, status, reason, created_at)
     VALUES ($1, $2, $3, $4, 'SCHEDULED', $5, CURRENT_TIMESTAMP)
     RETURNING slotID`,
    [doctorId, patientId, date, time, reason ?? null]
  );
  const slotId = inserted.rows[0].slotid;
  const doctorName = doctorCheck.rows[0].name;

  await query('UPDATE Patient SET last_appointment_date = CURRENT_TIMESTAMP WHERE patientID = $1', [
    patientId,
  ]);

  await query(
    `INSERT INTO MedicalHistory (patientID, history_text, recorded_date) VALUES ($1, $2, CURRENT_TIMESTAMP)`,
    [patientId, `📅 Appointment booked with Dr. ${doctorName} on ${date} at ${time}`]
  );

  await query(
    `INSERT INTO NotificationLog (patientID, message, sent_at) VALUES ($1, $2, CURRENT_TIMESTAMP)`,
    [patientId, `✅ Appointment confirmed with Dr. ${doctorName} on ${date} at ${time}`]
  );

  sendSuccess(
    res,
    201,
    { appointmentId: slotId },
    `Appointment booked successfully with Dr. ${doctorName} on ${date} at ${time}`
  );
});

/**
 * PUT /api/v1/appointments/:id/cancel (protected)
 */
export const cancelAppointment = asyncHandler(async (req: Request, res: Response) => {
  const slotId = Number(req.params.id);
  if (!req.user) throw ApiError.unauthorized();

  const info = await query<{
    doctorid: number;
    patientid: number;
    appointment_date: string;
    appointment_time: string;
    doctor_name: string;
  }>(
    `SELECT a.doctorID, a.patientID, TO_CHAR(a.appointment_date, 'YYYY-MM-DD') as appointment_date,
            a.appointment_time, d.name as doctor_name
     FROM AppointmentSlot a JOIN Doctor d ON a.doctorID = d.doctorID
     WHERE a.slotID = $1 AND a.status != 'CANCELLED'`,
    [slotId]
  );
  if (!info.rows.length) throw ApiError.notFound('Appointment not found or already cancelled');

  const appt = info.rows[0];
  const isOwner = req.user.role === 'patient' && Number(req.user.id) === appt.patientid;
  const isAssignedDoctor = req.user.role === 'doctor' && Number(req.user.id) === appt.doctorid;
  if (!isOwner && !isAssignedDoctor) throw ApiError.forbidden('You cannot cancel this appointment');

  await query("UPDATE AppointmentSlot SET status = 'CANCELLED' WHERE slotID = $1", [slotId]);

  await query(
    `INSERT INTO MedicalHistory (patientID, history_text, recorded_date) VALUES ($1, $2, CURRENT_TIMESTAMP)`,
    [
      appt.patientid,
      `❌ Appointment cancelled with Dr. ${appt.doctor_name} scheduled for ${appt.appointment_date} at ${appt.appointment_time}`,
    ]
  );

  sendSuccess(res, 200, {}, 'Appointment cancelled successfully');
});

/**
 * GET /api/v1/appointments/patient (protected)
 */
export const getPatientAppointments = asyncHandler(async (req: Request, res: Response) => {
  const patientId = requirePatientId(req);
  const result = await query(
    `SELECT a.slotID, TO_CHAR(a.appointment_date, 'YYYY-MM-DD') as appointment_date, a.appointment_time,
            a.status, a.reason, d.name as doctor_name, d.specialization
     FROM AppointmentSlot a JOIN Doctor d ON a.doctorID = d.doctorID
     WHERE a.patientID = $1 ORDER BY a.appointment_date DESC, a.appointment_time ASC`,
    [patientId]
  );
  sendSuccess(res, 200, { appointments: result.rows });
});

/**
 * GET /api/v1/appointments/doctor (protected, doctor)
 */
export const getDoctorAppointments = asyncHandler(async (req: Request, res: Response) => {
  const id = requireDoctorId(req);
  const result = await query(
    `SELECT a.slotID, TO_CHAR(a.appointment_date, 'YYYY-MM-DD') as appointment_date, a.appointment_time,
            a.status, a.reason, p.patientID, p.name as patient_name, p.phone
     FROM AppointmentSlot a JOIN Patient p ON a.patientID = p.patientID
     WHERE a.doctorID = $1 ORDER BY a.appointment_date DESC`,
    [id]
  );
  sendSuccess(res, 200, { appointments: result.rows });
});

/**
 * PUT /api/v1/appointments/:id/status (protected, doctor)
 */
export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const id = requireDoctorId(req);
  const slotId = Number(req.params.id);
  const { status } = req.body as UpdateAppointmentStatusInput;

  const result = await query(
    'UPDATE AppointmentSlot SET status = $1 WHERE slotID = $2 AND doctorID = $3 RETURNING slotID, status',
    [status, slotId, id]
  );

  if (!result.rows.length) throw ApiError.notFound('Appointment not found for this doctor');
  sendSuccess(res, 200, { appointment: result.rows[0] }, 'Appointment status updated');
});
