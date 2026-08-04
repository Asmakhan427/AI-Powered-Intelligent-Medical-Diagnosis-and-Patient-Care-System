import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../config/env';
import { clearStoredAuth, getStoredAuth, updateStoredAccessToken } from './authStorage';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const auth = getStoredAuth();
  if (auth?.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`;
  }
  return config;
});

// Dedupes concurrent 401s into a single /auth/refresh call instead of one per failed request.
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const auth = getStoredAuth();
  if (!auth?.refreshToken) return null;

  try {
    const { data } = await axios.post<{ accessToken: string }>(`${API_BASE_URL}/auth/refresh`, {
      refreshToken: auth.refreshToken,
    });
    updateStoredAccessToken(data.accessToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableConfig | undefined;
    const status = error.response?.status;
    const isAuthEndpoint =
      config?.url?.includes('/auth/login') || config?.url?.includes('/auth/signup');

    if (status === 401 && config && !config._retried && !isAuthEndpoint) {
      config._retried = true;

      refreshInFlight ??= refreshAccessToken().finally(() => {
        refreshInFlight = null;
      });
      const newToken = await refreshInFlight;

      if (newToken) {
        config.headers.Authorization = `Bearer ${newToken}`;
        return api(config);
      }
      clearStoredAuth();
    }

    return Promise.reject(error);
  }
);

/**
 * Extracts a user-facing message from an API error. The backend's error
 * handler returns `{ success: false, error: string, details?: unknown }`.
 */
export function getErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string } | undefined;
    if (data?.error) return data.error;
    if (error.code === 'ERR_NETWORK')
      return 'Could not reach the server. Check your connection and try again.';
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export default api;
