import rateLimit from 'express-rate-limit';

const jsonRateLimitMessage = (error: string) => ({ success: false, error });

/**
 * AI symptom analysis is the most expensive/abusable endpoint
 * (spawns the Python model). Capped at 10 requests/minute per IP.
 */
export const analysisLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonRateLimitMessage('Too many analysis requests. Please wait a minute and try again.'),
});

/** Back-compat alias for the previous name. */
export const aiAnalysisLimiter = analysisLimiter;

/**
 * Auth endpoints (login/signup) - brute-force guard.
 * 20 requests / 15 minutes per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonRateLimitMessage(
    'Too many authentication attempts. Please wait before trying again.'
  ),
});

/**
 * General-purpose limiter for the rest of the API surface.
 * 100 requests / minute per IP.
 */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonRateLimitMessage('Too many requests. Please slow down.'),
});

/**
 * Tighter limiter for sensitive write endpoints (booking, feedback, reviews).
 * 30 requests / minute per IP.
 */
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonRateLimitMessage('Too many requests. Please slow down.'),
});
