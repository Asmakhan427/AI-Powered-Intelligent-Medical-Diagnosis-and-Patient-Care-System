// ============================================
// AppError - operational error type for the Mongoose/service layer.
// Throw `AppError.badRequest(...)` etc. from services & controllers and
// let the centralized error handler translate it into a JSON response.
//
// Shape-compatible with the older `ApiError` (same statusCode/isOperational/
// details fields) so both can coexist during the pg -> Mongoose migration.
// ============================================
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown, isOperational = true) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }

  static badRequest(message = 'Bad request', details?: unknown): AppError {
    return new AppError(400, message, details);
  }

  static unauthorized(message = 'Unauthorized', details?: unknown): AppError {
    return new AppError(401, message, details);
  }

  static forbidden(message = 'Forbidden', details?: unknown): AppError {
    return new AppError(403, message, details);
  }

  static notFound(message = 'Resource not found', details?: unknown): AppError {
    return new AppError(404, message, details);
  }

  static conflict(message = 'Conflict', details?: unknown): AppError {
    return new AppError(409, message, details);
  }

  static unprocessable(message = 'Unprocessable entity', details?: unknown): AppError {
    return new AppError(422, message, details);
  }

  static tooManyRequests(message = 'Too many requests', details?: unknown): AppError {
    return new AppError(429, message, details);
  }

  static internal(message = 'Internal server error', details?: unknown): AppError {
    // Non-operational: signals a bug/unexpected condition worth alerting on.
    return new AppError(500, message, details, false);
  }
}

/**
 * Structural guard so the error handler can treat AppError and the legacy
 * ApiError (identical shape, different class identity) uniformly without a
 * hard import of both.
 */
export function isHttpError(
  err: unknown
): err is { statusCode: number; message: string; isOperational?: boolean; details?: unknown } {
  return (
    typeof err === 'object' &&
    err !== null &&
    typeof (err as { statusCode?: unknown }).statusCode === 'number' &&
    typeof (err as { message?: unknown }).message === 'string'
  );
}

export default AppError;
