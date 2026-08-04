// ============================================
// Auth service — business logic extracted from auth.controller.ts so it's
// testable in isolation (mock `query`, call the function directly) without
// spinning up Express or a real Postgres connection. The controller is now
// a thin HTTP adapter: parse the request, call the service, sendSuccess.
// ============================================
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { query } from '../config/db';
import { ApiError } from '../utils/ApiError';
import { issueTokenPair, type TokenPair } from '../utils/token.util';
import type { AuthUser } from '../types/express';

const SALT_ROUNDS = 10;

export interface RegisterPatientInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
  dateOfBirth?: string;
  bloodGroup?: string;
}

export interface RegisterPatientResult {
  patientId: number;
  user: { id: number; name: string; email: string; role: 'patient' };
  tokens: TokenPair;
}

/**
 * Registers a new patient account. Patients self-register; doctor accounts
 * are provisioned separately (no public signup surface for that role).
 */
export async function registerPatient(input: RegisterPatientInput): Promise<RegisterPatientResult> {
  const { name, email, phone, password, dateOfBirth, bloodGroup } = input;

  const existing = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM Patient WHERE email = $1',
    [email]
  );
  if (Number(existing.rows[0].count) > 0) {
    throw ApiError.conflict('Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const inserted = await query<{ patientid: number }>(
    `INSERT INTO Patient (name, email, phone, password_hash, date_of_birth, blood_group, created_at, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, true)
     RETURNING patientID`,
    [name, email, phone ?? null, passwordHash, dateOfBirth ?? null, bloodGroup ?? null]
  );

  const patientId = inserted.rows[0].patientid;
  const tokens = issueTokenPair({ id: patientId, role: 'patient', email, name });

  return { patientId, user: { id: patientId, name, email, role: 'patient' }, tokens };
}

interface CredentialRow {
  patientid?: number;
  doctorid?: number;
  name: string;
  email: string;
  password_hash: string;
  is_active: boolean;
}

export interface LoginResult {
  userId: number;
  name: string;
  role: 'patient' | 'doctor';
  tokens: TokenPair;
}

/**
 * Verifies credentials against the Patient or Doctor table (selected by
 * `role`) and issues a token pair on success.
 */
export async function loginUser(
  email: string,
  password: string,
  role: 'patient' | 'doctor'
): Promise<LoginResult> {
  const table = role === 'doctor' ? 'Doctor' : 'Patient';
  const idField = role === 'doctor' ? 'doctorid' : 'patientid';

  const result = await query<CredentialRow>(`SELECT * FROM ${table} WHERE email = $1`, [email]);

  if (!result.rows.length) {
    throw ApiError.unauthorized('Invalid credentials');
  }

  const user = result.rows[0];
  if (user.is_active === false) {
    throw ApiError.forbidden('This account has been deactivated');
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    throw ApiError.unauthorized('Invalid credentials');
  }

  const userId = (user as unknown as Record<string, number>)[idField];
  const tokens = issueTokenPair({ id: userId, role, email: user.email, name: user.name });

  return { userId, name: user.name, role, tokens };
}

export interface GuestLoginResult {
  guestId: string;
  role: 'guest';
  tokens: TokenPair;
}

/** Issues a short-lived guest identity — no account/persistence, just a signed token. */
export function guestLogin(): GuestLoginResult {
  const guestId = 'GUEST_' + crypto.randomBytes(4).toString('hex');
  const tokens = issueTokenPair({ id: guestId, role: 'guest', name: 'Guest User' });
  return { guestId, role: 'guest', tokens };
}

/** Re-exported for callers that only need token generation (e.g. the /refresh endpoint). */
export function generateTokensFor(user: AuthUser): TokenPair {
  return issueTokenPair(user);
}
