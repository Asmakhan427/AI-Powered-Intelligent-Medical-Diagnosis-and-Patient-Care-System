import { Request, Response } from 'express';
import { query } from '../config/db';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { callPythonModel, resolveDoctorId } from '../services/python.service';
import { getEducationArticle } from '../services/education.service';
import { AnalyzeSymptomsInput } from '../validators/ai.validator';

/** Keyword → specialist fallback map, mirrors doctor_map.json. */
const KEYWORD_DOCTOR_MAP: Record<string, string> = {
  heart: 'Cardiologist',
  cardiac: 'Cardiologist',
  stroke: 'Neurologist',
  brain: 'Neurologist',
  migraine: 'Neurologist',
  headache: 'Neurologist',
  lung: 'Pulmonologist',
  asthma: 'Pulmonologist',
  breathing: 'Pulmonologist',
  stomach: 'Gastroenterologist',
  abdominal: 'Gastroenterologist',
  liver: 'Gastroenterologist',
  skin: 'Dermatologist',
  rash: 'Dermatologist',
  joint: 'Rheumatologist',
  arthritis: 'Rheumatologist',
  urine: 'Urologist',
  kidney: 'Urologist',
  child: 'Pediatrician',
  baby: 'Pediatrician',
  infection: 'Infectious Disease Specialist',
  fever: 'General Physician',
  cold: 'General Physician',
  cough: 'General Physician',
};

function keywordDoctorLookup(diagnosis: string): string {
  const dl = diagnosis.toLowerCase();
  for (const [keyword, doctor] of Object.entries(KEYWORD_DOCTOR_MAP)) {
    if (dl.includes(keyword)) return doctor;
  }
  return 'General Physician';
}

/**
 * POST /api/v1/ai/analyze (rate limited: 10/min)
 * Works for guests (no persistence) and authenticated patients (persists
 * Report + MedicalHistory + SymptomAnalysisLog, and an EmergencyAlert row
 * when the model flags an emergency).
 */
export const analyzeSymptoms = asyncHandler(async (req: Request, res: Response) => {
  const { symptoms, inputType } = req.body as AnalyzeSymptomsInput;
  const startTime = Date.now();

  const isPatient = req.user?.role === 'patient';
  const patientId = isPatient ? Number(req.user!.id) : null;

  const prediction = await callPythonModel(symptoms);
  const assignedDoctorId = await resolveDoctorId(prediction.doctor);

  let reportId: number | null = null;

  if (patientId) {
    const inserted = await query<{ reportid: number }>(
      `INSERT INTO Report (patientID, doctorID, symptoms, ai_diagnosis, ai_confidence, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'PENDING', CURRENT_TIMESTAMP)
       RETURNING reportID`,
      [patientId, assignedDoctorId, symptoms, prediction.disease, prediction.confidence]
    );
    reportId = inserted.rows[0].reportid;

    await query(
      `INSERT INTO MedicalHistory (patientID, history_text, recorded_date) VALUES ($1, $2, CURRENT_TIMESTAMP)`,
      [
        patientId,
        `AI Diagnosis Report #${reportId}: ${prediction.disease} (Confidence: ${prediction.confidence}%). Status: Pending Review.`,
      ]
    );

    if (prediction.emergency) {
      await query(
        `INSERT INTO EmergencyAlert (patientID, severity, alert_timestamp) VALUES ($1, $2, CURRENT_TIMESTAMP)`,
        [patientId, prediction.severity]
      );
    }
  }

  await query(
    `INSERT INTO SymptomAnalysisLog (patientID, symptoms_input, input_type, ai_response, severity, log_timestamp)
     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
    [patientId, symptoms, inputType, prediction.disease, prediction.severity]
  );

  sendSuccess(
    res,
    200,
    {
      diagnosis: prediction.disease,
      confidence: prediction.confidence,
      emergencyDetected: prediction.emergency,
      severity: prediction.severity,
      description: prediction.description,
      recommendations: prediction.recommendations,
      differentials: prediction.differentials,
      symptomsDetected: prediction.symptomsDetected,
      assignedDoctor: prediction.doctor,
      doctorReason: prediction.reason,
      assignedDoctorId,
      reportId,
      responseTime: Date.now() - startTime,
    },
    prediction.emergency ? '🚨 CRITICAL: Seek immediate medical attention!' : 'Analysis complete.'
  );
});

/**
 * GET /api/v1/ai/education/:topic (public)
 */
export const getEducation = asyncHandler(async (req: Request, res: Response) => {
  const topic = String(req.params.topic).toLowerCase();
  sendSuccess(res, 200, { article: getEducationArticle(topic) });
});

/**
 * GET /api/v1/ai/doctor/:diagnosis (public)
 * Resolves a specialist recommendation + the seeded doctor record for a
 * free-text diagnosis string (keyword-matched, same rules predict.py uses).
 */
export const getDoctorRecommendation = asyncHandler(async (req: Request, res: Response) => {
  const diagnosis = String(req.params.diagnosis);
  const specialization = keywordDoctorLookup(diagnosis);

  const result = await query(
    'SELECT doctorID, name, specialization, consultation_fee, is_available FROM Doctor WHERE specialization = $1 AND is_available = true LIMIT 5',
    [specialization]
  );

  sendSuccess(res, 200, { specialization, doctors: result.rows });
});

/**
 * GET /api/v1/ai/history (protected)
 * Raw symptom-analysis log for the authenticated patient (distinct from
 * /patient/reports, which only covers persisted, reviewable Reports).
 */
export const getPredictionHistory = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'patient')
    throw ApiError.forbidden('Patient account required');

  const result = await query(
    `SELECT logID, symptoms_input, input_type, ai_response, severity,
            TO_CHAR(log_timestamp, 'YYYY-MM-DD HH24:MI') as log_timestamp
     FROM SymptomAnalysisLog WHERE patientID = $1 ORDER BY log_timestamp DESC`,
    [Number(req.user.id)]
  );
  sendSuccess(res, 200, { history: result.rows });
});
