// ============================================
// validation.ts - aggregation entry point for request validation.
// --------------------------------------------
// The reusable predicate/assertion helpers live in `./validators`.
// The per-route Zod request schemas live in `../validators/*.validator.ts`
// and are applied via the `validate()` middleware.
//
// This module re-exports the low-level validators so callers that prefer a
// single `utils/validation` import (per the original spec) keep working.
// ============================================
export * from './validators';
export {
  assertValidEmail,
  assertValidPhone,
  assertNonEmptyString,
  assertPasswordStrength,
  assertObjectId,
  assertValidDate,
  isValidEmail,
  isValidPhone,
  isValidDate,
  isValidObjectId,
  isValidTime,
} from './validators';
