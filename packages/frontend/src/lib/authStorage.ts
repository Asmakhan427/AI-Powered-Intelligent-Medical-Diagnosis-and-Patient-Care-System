// Token persistence for the auth flow.
// "Remember me" controls which Storage backend is used: localStorage
// survives browser restarts, sessionStorage is cleared when the tab closes.
// Both are checked on boot so a session started with "remember me" off
// still works for the rest of that tab's lifetime.
const STORAGE_KEY = 'medassist.auth';

export type StoredRole = 'patient' | 'doctor' | 'guest';

export interface StoredUser {
  id: string;
  name: string;
  email?: string;
  role: StoredRole;
}

export interface StoredAuth {
  accessToken: string;
  refreshToken: string;
  user: StoredUser;
}

function readFrom(storage: Storage): StoredAuth | null {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAuth;
  } catch {
    storage.removeItem(STORAGE_KEY);
    return null;
  }
}

/** Reads persisted auth, preferring localStorage (remember-me) over sessionStorage. */
export function getStoredAuth(): StoredAuth | null {
  return readFrom(window.localStorage) ?? readFrom(window.sessionStorage);
}

export function setStoredAuth(auth: StoredAuth, remember: boolean): void {
  const target = remember ? window.localStorage : window.sessionStorage;
  const other = remember ? window.sessionStorage : window.localStorage;
  target.setItem(STORAGE_KEY, JSON.stringify(auth));
  other.removeItem(STORAGE_KEY);
}

/** Updates just the access token in whichever storage currently holds the session. */
export function updateStoredAccessToken(accessToken: string): void {
  for (const storage of [window.localStorage, window.sessionStorage]) {
    const existing = readFrom(storage);
    if (existing) {
      storage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, accessToken }));
      return;
    }
  }
}

export function clearStoredAuth(): void {
  window.localStorage.removeItem(STORAGE_KEY);
  window.sessionStorage.removeItem(STORAGE_KEY);
}
