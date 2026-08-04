import { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Wraps an async route/controller handler so thrown errors and rejected
 * promises are forwarded to Express's `next(err)` instead of crashing
 * the process or requiring a try/catch in every controller.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export default asyncHandler;
