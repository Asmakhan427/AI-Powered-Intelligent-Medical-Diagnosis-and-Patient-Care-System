import type { ReactNode } from 'react';

// Central type barrel. Domain-specific types (Report, Appointment, Doctor,
// ...) live in their own files since they're large and map 1:1 to specific
// backend controllers — re-exported here so `import type { X } from
// '../types'` works from anywhere without knowing which domain file it's in.
export * from './patient';
export * from './doctor';

export type { AuthUser, AuthContextValue, SignupPayload } from '../context/AuthContext';
export type {
  AppNotification,
  NotificationType,
  NotificationContextValue,
} from '../context/NotificationContext';
export type { ThemeContextValue } from '../context/ThemeContext';
export type { Theme } from '../store/theme.store';

/**
 * The backend's success envelope is built by hand per-endpoint
 * (`sendSuccess(res, status, extra, message?)` in
 * packages/backend/src/utils/apiResponse.ts) and spreads `extra` at the top
 * level rather than nesting it under a `data` key — so `ApiSuccessResponse`
 * is intentionally an open shape, not `{ data: T }`. See individual
 * `lib/endpoints/*.ts` functions for each endpoint's actual fields.
 */
export interface ApiSuccessResponse {
  success: true;
  message?: string;
  [key: string]: unknown;
}

/** Matches packages/backend/src/middleware/errorHandler.middleware.ts's error shape. */
export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: unknown;
}

export type ApiResponse = ApiSuccessResponse | ApiErrorResponse;

/** Generic async-state shape for hand-rolled fetch effects (the pattern most pages currently use directly with useState). */
export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface WithClassName {
  className?: string;
}

export interface WithChildren {
  children?: ReactNode;
}
