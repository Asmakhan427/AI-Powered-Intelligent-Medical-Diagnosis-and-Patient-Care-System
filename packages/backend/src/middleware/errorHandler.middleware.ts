import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { MulterError } from 'multer';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import AppError, { isHttpError } from '../utils/AppError';
import logger from '../utils/logger';
import { IS_PRODUCTION } from '../config/env';

interface ErrorBody {
  success: false;
  error: string;
  details?: unknown;
}

/**
 * 404 handler - registered after all routes, before the error handler.
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

/** Alias matching the spec's `notFound` name. */
export const notFound = notFoundHandler;

/**
 * Centralized error handler. Registered last via `app.use(errorHandler)`.
 * Normalizes AppError/ApiError, Mongoose validation/cast/duplicate-key errors,
 * JWT errors and unknown errors into a single JSON shape:
 *   { success: false, error: string, details?: unknown }
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const body = normalizeError(err, req);
  res.status(body.statusCode).json(body.payload);
}

function normalizeError(err: unknown, req: Request): { statusCode: number; payload: ErrorBody } {
  // 1. Our own operational errors (AppError / legacy ApiError share this shape).
  if (isHttpError(err)) {
    if (err.isOperational === false) {
      logger.error('Non-operational error', { path: req.originalUrl, error: err.message });
    }
    return {
      statusCode: err.statusCode,
      payload: {
        success: false,
        error: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    };
  }

  // 2. Mongoose schema validation errors -> 400 with per-field details.
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
    return { statusCode: 400, payload: { success: false, error: 'Validation failed', details } };
  }

  // 3. Malformed ObjectId / bad cast -> 400.
  if (err instanceof mongoose.Error.CastError) {
    return {
      statusCode: 400,
      payload: { success: false, error: `Invalid value for '${err.path}'` },
    };
  }

  // 4. Duplicate key (unique index) -> 409.
  const mongoErr = err as { code?: number; keyValue?: Record<string, unknown> };
  if (mongoErr && mongoErr.code === 11000) {
    const field = mongoErr.keyValue ? Object.keys(mongoErr.keyValue)[0] : 'field';
    return {
      statusCode: 409,
      payload: { success: false, error: `Duplicate value for '${field}' - already exists` },
    };
  }

  // 5. Multer upload errors (size/count/unexpected field) -> 400.
  if (err instanceof MulterError) {
    const msg =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Uploaded file is too large'
        : err.code === 'LIMIT_FILE_COUNT'
          ? 'Too many files uploaded'
          : `Upload error: ${err.message}`;
    return { statusCode: 400, payload: { success: false, error: msg } };
  }

  // 6. JWT errors (in case a handler verifies tokens outside the auth middleware).
  if (err instanceof TokenExpiredError) {
    return { statusCode: 401, payload: { success: false, error: 'Token has expired' } };
  }
  if (err instanceof JsonWebTokenError) {
    return { statusCode: 401, payload: { success: false, error: 'Invalid token' } };
  }

  // 7. Unknown / unexpected -> 500 (hide internals in production).
  logger.error('Unhandled error', {
    path: req.originalUrl,
    method: req.method,
    error: (err as Error)?.message,
    stack: (err as Error)?.stack,
  });
  const message = IS_PRODUCTION
    ? 'Internal server error'
    : (err as Error)?.message || 'Internal server error';
  return { statusCode: 500, payload: { success: false, error: message } };
}

export { asyncHandler } from '../utils/asyncHandler';
export default errorHandler;
