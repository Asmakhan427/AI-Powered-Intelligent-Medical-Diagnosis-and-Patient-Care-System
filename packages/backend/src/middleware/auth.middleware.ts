import { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import AppError from '../utils/AppError';
import { JWT_SECRET } from '../config/env';
import { UserRole } from '../types/express';

/**
 * Shape of the JWT payload issued by the model `generateToken()` methods and
 * the auth service (guest tokens omit `id` and carry a `sessionId`).
 */
interface JwtPayload {
  id?: string;
  role: UserRole;
  email?: string;
  name?: string;
  sessionId?: string;
}

function decodeToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

function attachUser(req: Request, payload: JwtPayload): void {
  req.user = {
    id: payload.id ?? payload.sessionId ?? '',
    role: payload.role,
    email: payload.email,
    name: payload.name,
  };
}

/**
 * Verifies the `Authorization: Bearer <token>` header and attaches
 * `req.user` on success. Rejects with 401 otherwise.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return next(AppError.unauthorized('Missing or malformed Authorization header'));
  }

  const token = header.slice('Bearer '.length).trim();

  try {
    attachUser(req, decodeToken(token));
    return next();
  } catch {
    return next(AppError.unauthorized('Invalid or expired token'));
  }
}

/**
 * Optional authentication - attaches req.user if a valid token is present,
 * but does not reject the request otherwise. Useful for guest-accessible
 * endpoints (e.g. symptom analysis) that behave differently when logged in.
 */
export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return next();

  try {
    attachUser(req, decodeToken(header.slice('Bearer '.length).trim()));
  } catch {
    // ignore invalid token for optional auth
  }
  return next();
}

/**
 * Role-based authorization. Must run after `authenticate`.
 * Usage: router.get('/x', authenticate, authorize('doctor'), handler)
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(AppError.unauthorized('Authentication required'));
    if (!allowedRoles.includes(req.user.role)) {
      return next(AppError.forbidden(`Requires role: ${allowedRoles.join(' or ')}`));
    }
    return next();
  };
}

/**
 * Convenience: ensures the authenticated patient can only access their own
 * resources unless the requester is a doctor. `idExtractor` pulls the target
 * owner id (usually a `:id`/`patientId` param or body field) to compare
 * against `req.user.id`.
 */
export function ensureSelfOrDoctor(idExtractor: (req: Request) => string | number | undefined) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(AppError.unauthorized('Authentication required'));
    if (req.user.role === 'doctor') return next();

    const targetId = idExtractor(req);
    if (targetId !== undefined && String(targetId) !== String(req.user.id)) {
      return next(AppError.forbidden('You may only access your own resources'));
    }
    return next();
  };
}

/* ------------------------------------------------------------------ */
/* Named guards (per spec) — compose authenticate + role check         */
/* Usage: router.post('/x', ...requirePatient, handler)                */
/*    or: router.post('/x', requireAuth, handler)                      */
/* Express flattens arrays of handlers, so either spread or pass directly. */
/* ------------------------------------------------------------------ */

/** Ensure the caller is logged in (any role). */
export const requireAuth: RequestHandler = authenticate;

/** Ensure the caller is an authenticated patient. */
export const requirePatient: RequestHandler[] = [authenticate, authorize('patient')];

/** Ensure the caller is an authenticated doctor. */
export const requireDoctor: RequestHandler[] = [authenticate, authorize('doctor')];

/** Ensure the caller is a guest (unauthenticated session token). */
export const requireGuest: RequestHandler[] = [authenticate, authorize('guest')];
