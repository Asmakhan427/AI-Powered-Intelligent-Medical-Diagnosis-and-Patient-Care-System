// ============================================
// Validators - reusable input assertions & predicates
// --------------------------------------------
// Two flavours:
//   1. Boolean predicates  (isValidEmail, isValidPhone, ...) for branching.
//   2. `assert*` guards     that sanitize and RETURN the cleaned value, or
//      throw an operational AppError(400) with a helpful message. These are
//      what the service layer uses so controllers stay thin.
// ============================================
import AppError from './AppError';

// RFC-5322-lite: good enough to reject obvious garbage without false negatives.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// International-ish phone: digits, spaces, +, -, parentheses; 7-20 chars.
const PHONE_REGEX = /^[0-9+\-\s()]{7,20}$/;
// 24-char hex Mongo ObjectId.
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
// HH:MM 24-hour clock.
const TIME_24H_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

/* ------------------------------------------------------------------ */
/* Predicates                                                          */
/* ------------------------------------------------------------------ */

export function isValidEmail(value: unknown): value is string {
  return typeof value === 'string' && EMAIL_REGEX.test(value.trim());
}

export function isValidPhone(value: unknown): value is string {
  return typeof value === 'string' && PHONE_REGEX.test(value.trim());
}

export function isValidObjectId(value: unknown): value is string {
  return typeof value === 'string' && OBJECT_ID_REGEX.test(value);
}

export function isValidTime(value: unknown): value is string {
  return typeof value === 'string' && TIME_24H_REGEX.test(value);
}

/**
 * Accepts an ISO date string OR a Date and confirms it's a real calendar date.
 */
export function isValidDate(value: unknown): boolean {
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  if (typeof value !== 'string') return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

/* ------------------------------------------------------------------ */
/* Assertions (sanitize + return, or throw AppError)                   */
/* ------------------------------------------------------------------ */

/**
 * Ensures `value` is a non-empty string, trims it, and enforces a max length.
 * Returns the cleaned string.
 */
export function assertNonEmptyString(value: unknown, label = 'Value', maxLength = 1000): string {
  if (typeof value !== 'string') {
    throw AppError.badRequest(`${label} must be a string`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw AppError.badRequest(`${label} is required`);
  }
  if (trimmed.length > maxLength) {
    throw AppError.badRequest(`${label} must be at most ${maxLength} characters`);
  }
  return trimmed;
}

/**
 * Validates and normalizes an email address (lowercased, trimmed).
 */
export function assertValidEmail(value: unknown): string {
  const email = assertNonEmptyString(value, 'Email', 254).toLowerCase();
  if (!EMAIL_REGEX.test(email)) {
    throw AppError.badRequest('Please provide a valid email address');
  }
  return email;
}

/**
 * Validates a phone number and returns it trimmed.
 */
export function assertValidPhone(value: unknown): string {
  const phone = assertNonEmptyString(value, 'Phone', 20);
  if (!PHONE_REGEX.test(phone)) {
    throw AppError.badRequest('Please provide a valid phone number');
  }
  return phone;
}

/**
 * Password policy: 8-72 chars (bcrypt's 72-byte limit), at least one letter
 * and one number. Returns the raw password unchanged (never trimmed — leading/
 * trailing spaces can be intentional).
 */
export function assertPasswordStrength(value: unknown): string {
  if (typeof value !== 'string') {
    throw AppError.badRequest('Password must be a string');
  }
  if (value.length < 8) {
    throw AppError.badRequest('Password must be at least 8 characters long');
  }
  if (value.length > 72) {
    throw AppError.badRequest('Password must be at most 72 characters long');
  }
  if (!/[a-zA-Z]/.test(value) || !/[0-9]/.test(value)) {
    throw AppError.badRequest('Password must contain at least one letter and one number');
  }
  return value;
}

/**
 * Validates a Mongo ObjectId string; returns it unchanged.
 */
export function assertObjectId(value: unknown, label = 'id'): string {
  if (!isValidObjectId(value)) {
    throw AppError.badRequest(`Invalid ${label}`);
  }
  return value as string;
}

/**
 * Parses an ISO date string / Date into a valid Date, throwing otherwise.
 */
export function assertValidDate(value: unknown, label = 'Date'): Date {
  if (!isValidDate(value)) {
    throw AppError.badRequest(`${label} must be a valid date`);
  }
  return value instanceof Date ? value : new Date(value as string);
}
