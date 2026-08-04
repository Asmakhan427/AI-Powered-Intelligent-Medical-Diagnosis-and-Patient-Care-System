import { Response } from 'express';

interface SuccessPayload<T> {
  success: true;
  message?: string;
  data?: T;
  [extra: string]: unknown;
}

/**
 * Sends a consistent success envelope: { success: true, ...extra }
 * `extra` is spread at the top level so existing frontend code that
 * expects fields like `diagnosis`, `appointments`, `reports` etc.
 * directly on the JSON body keeps working.
 */
export function sendSuccess<T extends Record<string, unknown> = Record<string, unknown>>(
  res: Response,
  statusCode: number,
  extra: T,
  message?: string
): Response {
  const payload: SuccessPayload<T> = { success: true, ...(message ? { message } : {}), ...extra };
  return res.status(statusCode).json(payload);
}

export default sendSuccess;
