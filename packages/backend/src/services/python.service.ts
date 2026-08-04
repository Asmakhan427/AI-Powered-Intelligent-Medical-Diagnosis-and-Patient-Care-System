import { spawn } from 'child_process';
import path from 'path';
import { ApiError } from '../utils/ApiError';
import { query } from '../config/db';
import { PYTHON_EXECUTABLE, PREDICT_SCRIPT_PATH } from '../config/env';

export interface PredictionDifferential {
  disease: string;
  confidence: number;
}

export interface PythonPredictionResult {
  disease: string;
  confidence: number;
  severity: 'MILD' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
  emergency: boolean;
  doctor: string;
  reason: string;
  description: string | null;
  recommendations: string;
  differentials: PredictionDifferential[];
  symptomsDetected: string[];
}

// Previously read process.env.PYTHON_BIN / left PREDICT_SCRIPT_PATH's
// fallback pointed at process.cwd() — PYTHON_BIN was never actually a real
// env var name (.env only ever defined PYTHON_EXECUTABLE), so this always
// silently ran the hardcoded 'python' default regardless of configuration.
const PYTHON_BIN = PYTHON_EXECUTABLE;
const PREDICT_SCRIPT = path.isAbsolute(PREDICT_SCRIPT_PATH)
  ? PREDICT_SCRIPT_PATH
  : path.resolve(__dirname, '../..', PREDICT_SCRIPT_PATH);

/**
 * Spawns predict.py with the raw symptom text and parses its stdout JSON.
 * Mirrors the behavior of the original callPythonModel() in server.js.
 */
export function callPythonModel(symptoms: string): Promise<PythonPredictionResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn(PYTHON_BIN, [PREDICT_SCRIPT, symptoms]);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(ApiError.internal('AI model process exited with an error', stderr));
        return;
      }
      try {
        resolve(JSON.parse(stdout) as PythonPredictionResult);
      } catch {
        reject(ApiError.internal('Failed to parse AI model output'));
      }
    });

    proc.on('error', (err) => {
      reject(ApiError.internal('Failed to start AI model process', err.message));
    });
  });
}

/**
 * Resolves a specialist title (as returned by predict.py, sourced from
 * ml/doctor_map.json) to a real seeded Doctor row. Looks the specialization
 * up directly in the database rather than a hardcoded ID table — a
 * hardcoded id->specialization table silently breaks the moment doctors are
 * seeded in a different order (as happened here: sql/schema.sql's seed
 * order didn't match this file's old assumed order at all), assigning
 * reports to the wrong doctor or a nonexistent id.
 */
export async function resolveDoctorId(specialistTitle: string): Promise<number | null> {
  const result = await query<{ doctorid: number }>(
    'SELECT doctorID FROM Doctor WHERE specialization = $1 AND is_available = true ORDER BY doctorID LIMIT 1',
    [specialistTitle]
  );
  if (result.rows.length) return result.rows[0].doctorid;

  if (specialistTitle !== 'General Physician') {
    const fallback = await query<{ doctorid: number }>(
      "SELECT doctorID FROM Doctor WHERE specialization = 'General Physician' AND is_available = true ORDER BY doctorID LIMIT 1"
    );
    if (fallback.rows.length) return fallback.rows[0].doctorid;
  }

  return null;
}
