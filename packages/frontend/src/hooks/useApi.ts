import axios, { type AxiosRequestConfig } from 'axios';
import { useCallback, useRef, useState } from 'react';
import { api, getErrorMessage } from '../lib/api';

export interface UseApiRequestOptions extends AxiosRequestConfig {
  /** Extra attempts after the first failure. Only retries network errors and 5xx — never 4xx (those won't succeed on retry). Default 0. */
  retries?: number;
  /** Base delay between retries in ms; each subsequent attempt waits `retryDelayMs * attempt`. Default 400. */
  retryDelayMs?: number;
}

export interface UseApiResult {
  loading: boolean;
  error: string | null;
  apiGet: <T = unknown>(url: string, options?: UseApiRequestOptions) => Promise<T>;
  apiPost: <T = unknown>(url: string, data?: unknown, options?: UseApiRequestOptions) => Promise<T>;
  apiPut: <T = unknown>(url: string, data?: unknown, options?: UseApiRequestOptions) => Promise<T>;
  apiDelete: <T = unknown>(url: string, options?: UseApiRequestOptions) => Promise<T>;
  /** Clears the current error without making a request. */
  resetError: () => void;
}

function isRetryable(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false;
  if (!err.response) return true; // network error / timeout — worth a retry
  return err.response.status >= 500;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Hook wrapper around the shared `api` axios instance (which already
 * handles bearer-token injection and silent refresh-on-401 — see
 * lib/api.ts) adding the ergonomics most call sites hand-roll themselves:
 * loading/error state and opt-in retry with backoff for transient failures.
 *
 * Each call site gets its own `loading`/`error` — this hook is meant to be
 * called once per component, not shared globally.
 */
export function useApi(): UseApiResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Guards against a stale request's `finally` clobbering loading state set by a newer one.
  const requestIdRef = useRef(0);

  const request = useCallback(
    async <T>(run: () => Promise<T>, options?: UseApiRequestOptions): Promise<T> => {
      const id = ++requestIdRef.current;
      const retries = options?.retries ?? 0;
      const retryDelayMs = options?.retryDelayMs ?? 400;

      setLoading(true);
      setError(null);

      let attempt = 0;
      for (;;) {
        try {
          const result = await run();
          if (requestIdRef.current === id) setLoading(false);
          return result;
        } catch (err) {
          const canRetry = attempt < retries && isRetryable(err);
          if (!canRetry) {
            if (requestIdRef.current === id) {
              setLoading(false);
              setError(getErrorMessage(err));
            }
            throw err;
          }
          attempt += 1;
          await sleep(retryDelayMs * attempt);
        }
      }
    },
    []
  );

  const apiGet = useCallback(
    <T>(url: string, options?: UseApiRequestOptions) =>
      request<T>(() => api.get<T>(url, options).then((r) => r.data), options),
    [request]
  );
  const apiPost = useCallback(
    <T>(url: string, data?: unknown, options?: UseApiRequestOptions) =>
      request<T>(() => api.post<T>(url, data, options).then((r) => r.data), options),
    [request]
  );
  const apiPut = useCallback(
    <T>(url: string, data?: unknown, options?: UseApiRequestOptions) =>
      request<T>(() => api.put<T>(url, data, options).then((r) => r.data), options),
    [request]
  );
  const apiDelete = useCallback(
    <T>(url: string, options?: UseApiRequestOptions) =>
      request<T>(() => api.delete<T>(url, options).then((r) => r.data), options),
    [request]
  );

  const resetError = useCallback(() => setError(null), []);

  return { loading, error, apiGet, apiPost, apiPut, apiDelete, resetError };
}

export default useApi;
