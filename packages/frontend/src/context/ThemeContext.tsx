import { createContext, useContext, type ReactNode } from 'react';
import { useThemeStore, type Theme } from '../store/theme.store';

/**
 * Theme state actually lives in a zustand store (`store/theme.store.ts`) —
 * it needs to be readable before React mounts (index.html's inline script
 * applies the initial class to avoid a flash of the wrong theme) and
 * zustand's plain-module state suits that better than Context, which only
 * exists once a Provider has rendered. This file wraps that store in the
 * Context-shaped API requested here (`ThemeProvider` + `useTheme()`) without
 * duplicating the state itself — `ThemeProvider` is a passthrough; the
 * store already the single source of truth.
 */
export interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const setTheme = useThemeStore((s) => s.setTheme);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Reads theme state directly from the zustand store — works with or without
 * `<ThemeProvider>` mounted (the store doesn't need one), but goes through
 * Context when available for consistency with the rest of this module's API.
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const setTheme = useThemeStore((s) => s.setTheme);
  return ctx ?? { theme, toggleTheme, setTheme };
}
