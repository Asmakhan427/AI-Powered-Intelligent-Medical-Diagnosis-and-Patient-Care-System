import type { ReactNode } from 'react';

export interface NavItem {
  id: string;
  label: string;
  to: string;
  icon: ReactNode;
  badge?: ReactNode;
  /** Passed to react-router's `NavLink` — use for routes like `/` that would otherwise match every path. */
  end?: boolean;
}

export interface AppUser {
  name: string;
  email?: string;
  role?: string;
  avatarUrl?: string;
}
