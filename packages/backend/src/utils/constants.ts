// ============================================
// Constants - shared enums, status codes and messages
// --------------------------------------------
// Centralizes the "magic strings/numbers" used across the app so they stay
// consistent between middleware, services and the socket layer.
// ============================================

/* ------------------------------------------------------------------ */
/* HTTP status codes                                                   */
/* ------------------------------------------------------------------ */

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export type HttpStatus = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS];

/* ------------------------------------------------------------------ */
/* Roles                                                               */
/* ------------------------------------------------------------------ */

export const ROLES = {
  PATIENT: 'patient',
  DOCTOR: 'doctor',
  GUEST: 'guest',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
export const ALL_ROLES: Role[] = [ROLES.PATIENT, ROLES.DOCTOR, ROLES.GUEST];

/* ------------------------------------------------------------------ */
/* Domain statuses                                                     */
/* ------------------------------------------------------------------ */

export const APPOINTMENT_STATUS = {
  SCHEDULED: 'SCHEDULED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
} as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUS)[keyof typeof APPOINTMENT_STATUS];

export const REPORT_STATUS = {
  PENDING: 'PENDING',
  REVIEWED: 'REVIEWED',
  COMPLETED: 'COMPLETED',
} as const;
export type ReportStatus = (typeof REPORT_STATUS)[keyof typeof REPORT_STATUS];

export const SEVERITY = {
  MILD: 'MILD',
  MODERATE: 'MODERATE',
  SEVERE: 'SEVERE',
  CRITICAL: 'CRITICAL',
} as const;
export type Severity = (typeof SEVERITY)[keyof typeof SEVERITY];

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];

/* ------------------------------------------------------------------ */
/* Error / response messages                                          */
/* ------------------------------------------------------------------ */

export const ERROR_MESSAGES = {
  // Auth
  MISSING_TOKEN: 'Missing or malformed Authorization header',
  INVALID_TOKEN: 'Invalid or expired token',
  AUTH_REQUIRED: 'Authentication required',
  FORBIDDEN_ROLE: 'You do not have permission to perform this action',
  INVALID_CREDENTIALS: 'Invalid email or password',
  EMAIL_TAKEN: 'An account with this email already exists',

  // Generic
  NOT_FOUND: 'Resource not found',
  VALIDATION_FAILED: 'Validation failed',
  INTERNAL: 'Internal server error',
  RATE_LIMITED: 'Too many requests. Please slow down.',

  // Domain
  SLOT_TAKEN: 'That appointment slot is no longer available',
  AI_UNAVAILABLE: 'The AI model is temporarily unavailable. Please try again shortly.',
} as const;

export const SUCCESS_MESSAGES = {
  REGISTERED: 'Account created successfully',
  LOGGED_IN: 'Logged in successfully',
  LOGGED_OUT: 'Logged out successfully',
  APPOINTMENT_BOOKED: 'Appointment booked successfully',
  APPOINTMENT_CANCELLED: 'Appointment cancelled',
} as const;

/* ------------------------------------------------------------------ */
/* Socket.io event names                                              */
/* ------------------------------------------------------------------ */

export const SOCKET_EVENTS = {
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  // Client -> server
  JOIN: 'notification:join',
  MARK_READ: 'notification:read',
  // Server -> client
  NOTIFICATION: 'notification:new',
  APPOINTMENT_UPDATE: 'appointment:update',
  EMERGENCY_ALERT: 'emergency:alert',
} as const;

/* ------------------------------------------------------------------ */
/* Uploads                                                             */
/* ------------------------------------------------------------------ */

export const ALLOWED_UPLOAD_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;
