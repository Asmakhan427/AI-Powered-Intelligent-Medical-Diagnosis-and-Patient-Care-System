import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodTypeAny } from 'zod';
import AppError from '../utils/AppError';

export type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Validates `req[target]` against the given Zod schema and replaces it with
 * the parsed (coerced/defaulted) value on success.
 *
 * Accepts any ZodTypeAny (not just ZodObject) so schemas built with
 * `.refine()` / `.transform()` (which return ZodEffects) work too.
 *
 * Usage: router.post('/x', validate(createXSchema), handler)
 */
export function validate(schema: ZodTypeAny, target: ValidationTarget = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[target]);
      (req as unknown as Record<ValidationTarget, unknown>)[target] = parsed;
      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.errors.map((e) => ({ path: e.path.join('.'), message: e.message }));
        return next(AppError.badRequest('Validation failed', details));
      }
      return next(err);
    }
  };
}

/** Validate URL path params (`req.params`). */
export function validateParams(schema: ZodTypeAny) {
  return validate(schema, 'params');
}

/** Validate query-string params (`req.query`). */
export function validateQuery(schema: ZodTypeAny) {
  return validate(schema, 'query');
}

/** Validate the request body (`req.body`) — explicit alias for readability. */
export function validateBody(schema: ZodTypeAny) {
  return validate(schema, 'body');
}

export default validate;
