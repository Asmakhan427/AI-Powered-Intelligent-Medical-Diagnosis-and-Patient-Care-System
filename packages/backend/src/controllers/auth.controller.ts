import { Request, Response } from 'express';
import { query } from '../config/db';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { verifyRefreshToken, signAccessToken } from '../utils/token.util';
import { LoginInput, RefreshTokenInput, SignupInput } from '../validators/auth.validator';
import * as authService from '../services/auth.service';

/**
 * POST /api/v1/auth/signup
 * Patients self-register. Doctor accounts are provisioned separately (not
 * exposed as a public signup surface).
 */
export const signup = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as SignupInput;
  const { patientId, user, tokens } = await authService.registerPatient(input);
  sendSuccess(res, 201, { patientId, user, ...tokens }, 'Account created successfully');
});

/**
 * POST /api/v1/auth/login
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, role } = req.body as LoginInput;
  const {
    userId,
    name,
    role: userRole,
    tokens,
  } = await authService.loginUser(email, password, role);
  sendSuccess(res, 200, { userId, name, role: userRole, ...tokens }, 'Login successful');
});

/**
 * POST /api/v1/auth/guest
 * Issues a short-lived guest token so guest users can hit rate-limited
 * public endpoints (e.g. symptom analysis) without a full account.
 */
export const guestLogin = asyncHandler(async (_req: Request, res: Response) => {
  const { guestId, role, tokens } = authService.guestLogin();
  sendSuccess(res, 200, { guestId, role, ...tokens }, 'Guest session started');
});

/**
 * POST /api/v1/auth/logout
 * Stateless JWTs can't be server-invalidated without a blocklist; this
 * endpoint exists for symmetry / future token-blocklist wiring and to
 * close out SessionLog rows if a sessionId is supplied.
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.body as { sessionId?: number };
  if (sessionId) {
    await query('UPDATE SessionLog SET end_time = CURRENT_TIMESTAMP WHERE sessionID = $1', [
      sessionId,
    ]);
  }
  sendSuccess(res, 200, {}, 'Logged out successfully');
});

/**
 * POST /api/v1/auth/refresh
 * Exchanges a valid refresh token for a new access token.
 */
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken: token } = req.body as RefreshTokenInput;

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  if (payload.type !== 'refresh') {
    throw ApiError.unauthorized('Invalid token type');
  }

  const accessToken = signAccessToken({
    id: payload.id,
    role: payload.role,
    email: payload.email,
    name: payload.name,
  });
  sendSuccess(res, 200, { accessToken });
});

/**
 * GET /api/v1/auth/me (protected)
 */
export const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();

  if (req.user.role === 'guest') {
    sendSuccess(res, 200, { user: req.user });
    return;
  }

  const table = req.user.role === 'doctor' ? 'Doctor' : 'Patient';
  const idField = req.user.role === 'doctor' ? 'doctorID' : 'patientID';

  const result = await query(`SELECT * FROM ${table} WHERE ${idField} = $1`, [req.user.id]);

  if (!result.rows.length) throw ApiError.notFound('User not found');

  const { password_hash: _omit, ...safeUser } = result.rows[0] as Record<string, unknown>;
  sendSuccess(res, 200, { user: { ...safeUser, role: req.user.role } });
});
