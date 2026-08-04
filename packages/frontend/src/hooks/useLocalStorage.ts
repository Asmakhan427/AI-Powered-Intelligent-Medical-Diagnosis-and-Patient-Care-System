import { useCallback, useEffect, useState } from 'react';

export type SetValue<T> = (value: T | ((prev: T) => T)) => void;

/**
 * Generic localStorage-backed state with JSON serialization. Syncs across
 * same-origin tabs via the `storage` event. Falls back to `initialValue`
 * silently if localStorage is unavailable (private browsing, quota, etc.)
 * or the stored value fails to parse.
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, SetValue<T>, () => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item !== null ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setStoredValue = useCallback<SetValue<T>>(
    (next) => {
      setValue((prev) => {
        const resolved = next instanceof Function ? next(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // Quota exceeded / storage disabled — keep the in-memory value regardless.
        }
        return resolved;
      });
    },
    [key]
  );

  const remove = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
    setValue(initialValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key !== key) return;
      try {
        setValue(event.newValue !== null ? (JSON.parse(event.newValue) as T) : initialValue);
      } catch {
        // ignore malformed writes from other tabs
      }
    };
    window.addEventListener('storage', handleStorageEvent);
    return () => window.removeEventListener('storage', handleStorageEvent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return [value, setStoredValue, remove];
}

export default useLocalStorage;
