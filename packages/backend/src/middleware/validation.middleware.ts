// ============================================
// validation.middleware.ts - spec-named entry point.
// --------------------------------------------
// Implementation lives in `./validate.middleware.ts` (kept for backward
// compatibility). Re-exported here under the spec's names:
//   - validate(schema)        -> validate request body with Zod
//   - validateParams(schema)  -> validate URL params
//   - validateQuery(schema)   -> validate query params
// ============================================
export { validate, validateParams, validateQuery, validateBody } from './validate.middleware';
export type { ValidationTarget } from './validate.middleware';

export { default } from './validate.middleware';
