import { Request, Response } from 'express';
import { query } from '../config/db';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { SubmitFeedbackInput } from '../validators/feedback.validator';

/**
 * POST /api/v1/feedback/submit (protected)
 * De-duplicates within a 1-hour window per patient, matching prior behavior.
 */
export const submitFeedback = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'patient')
    throw ApiError.forbidden('Patient account required');
  const patientId = Number(req.user.id);
  const { doctorId, rating, comments } = req.body as SubmitFeedbackInput;

  const duplicate = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM Feedback
     WHERE patientID = $1 AND created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'`,
    [patientId]
  );

  if (Number(duplicate.rows[0].count) > 0) {
    sendSuccess(res, 200, { duplicate: true }, 'Feedback already submitted recently. Thank you!');
    return;
  }

  const inserted = await query<{ feedbackid: number }>(
    `INSERT INTO Feedback (patientID, doctorID, rating, comments, created_at)
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
     RETURNING feedbackID`,
    [patientId, doctorId ?? null, rating, comments ?? null]
  );

  sendSuccess(
    res,
    201,
    { feedbackId: inserted.rows[0].feedbackid },
    'Thank you for your feedback!'
  );
});

/**
 * GET /api/v1/feedback/:id (protected)
 */
export const getFeedback = asyncHandler(async (req: Request, res: Response) => {
  const feedbackId = Number(req.params.id);

  const result = await query(
    `SELECT f.feedbackID, f.patientID, f.doctorID, f.rating, f.comments, f.created_at,
            p.name as patient_name, d.name as doctor_name
     FROM Feedback f
     JOIN Patient p ON f.patientID = p.patientID
     LEFT JOIN Doctor d ON f.doctorID = d.doctorID
     WHERE f.feedbackID = $1`,
    [feedbackId]
  );

  if (!result.rows.length) throw ApiError.notFound('Feedback not found');

  const feedback = result.rows[0] as { patientid: number };
  const isOwner = req.user?.role === 'patient' && Number(req.user.id) === feedback.patientid;
  const isDoctor = req.user?.role === 'doctor';
  if (!isOwner && !isDoctor)
    throw ApiError.forbidden('You do not have access to this feedback entry');

  sendSuccess(res, 200, { feedback: result.rows[0] });
});

/**
 * GET /api/v1/feedback/stats (protected)
 * Aggregate rating stats; doctors see their own, patients see platform-wide.
 */
export const getStats = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();

  if (req.user.role === 'doctor') {
    const result = await query<{ count: string; avg_rating: string | null }>(
      'SELECT COUNT(*) as count, AVG(rating) as avg_rating FROM Feedback WHERE doctorID = $1',
      [Number(req.user.id)]
    );
    sendSuccess(res, 200, {
      totalFeedback: Number(result.rows[0]?.count ?? 0),
      averageRating: result.rows[0]?.avg_rating
        ? Number(result.rows[0].avg_rating).toFixed(2)
        : null,
    });
    return;
  }

  const result = await query<{ count: string; avg_rating: string | null }>(
    'SELECT COUNT(*) as count, AVG(rating) as avg_rating FROM Feedback'
  );
  sendSuccess(res, 200, {
    totalFeedback: Number(result.rows[0]?.count ?? 0),
    averageRating: result.rows[0]?.avg_rating ? Number(result.rows[0].avg_rating).toFixed(2) : null,
  });
});
