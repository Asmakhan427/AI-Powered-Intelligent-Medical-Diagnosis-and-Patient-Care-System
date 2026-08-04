// Plain predicate/message validators for places that need a quick check
// outside a full zod schema (e.g. an inline field-blur check). The
// react-hook-form + zod schemas in pages/auth/authSchemas.ts remain the
// source of truth for actual form submission — these mirror the same rules
// (see packages/backend/src/utils/validators.ts) so client-side and
// server-side validation never disagree.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+\-\s()]{7,20}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

export function isValidPhone(value: string): boolean {
  return PHONE_REGEX.test(value.trim());
}

export interface PasswordStrength {
  valid: boolean;
  message?: string;
}

/** Matches the backend's rule: 6-72 chars (bcrypt's limit), at least one letter and one number. */
export function checkPasswordStrength(value: string): PasswordStrength {
  if (value.length < 6) return { valid: false, message: 'Password must be at least 6 characters.' };
  if (value.length > 72)
    return { valid: false, message: 'Password must be at most 72 characters.' };
  if (!/[a-zA-Z]/.test(value) || !/[0-9]/.test(value)) {
    return { valid: false, message: 'Password must contain at least one letter and one number.' };
  }
  return { valid: true };
}

export function isValidPassword(value: string): boolean {
  return checkPasswordStrength(value).valid;
}

/** True for any string Date can parse into a real calendar date — accepts "2026-07-17", ISO timestamps, etc. */
export function isValidDate(value: string | Date): boolean {
  const date = value instanceof Date ? value : new Date(value);
  return !Number.isNaN(date.getTime());
}

export function isPastDate(value: string | Date): boolean {
  if (!isValidDate(value)) return false;
  const date = value instanceof Date ? value : new Date(value);
  return date.getTime() < Date.now();
}

export function isFutureDate(value: string | Date): boolean {
  if (!isValidDate(value)) return false;
  const date = value instanceof Date ? value : new Date(value);
  return date.getTime() > Date.now();
}

export function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}
