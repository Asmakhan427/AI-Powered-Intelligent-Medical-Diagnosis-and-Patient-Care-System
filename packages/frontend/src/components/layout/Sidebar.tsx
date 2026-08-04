import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { LogOutIcon, PhoneIcon, UserIcon } from '../common/icons';
import type { AppUser, NavItem } from './types';

export interface SidebarProps {
  items: NavItem[];
  user?: AppUser;
  onLogout?: () => void;
  /** Mobile off-canvas open state. Always visible (static) at the `md` breakpoint and above. */
  isOpen: boolean;
  onClose: () => void;
  emergencyNumber?: string;
  className?: string;
}

function BrandMark() {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white">
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
        <path d="M10 3v14M3 10h14" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function Sidebar({
  items,
  user,
  onLogout,
  isOpen,
  onClose,
  emergencyNumber,
  className,
}: SidebarProps) {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-gray-900/50 animate-fade-in md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white',
          'transition-transform duration-200 ease-in-out',
          'dark:border-gray-800 dark:bg-gray-900',
          'md:static md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          'print:hidden',
          className
        )}
        aria-label="Main navigation"
      >
        <div className="flex items-center gap-2.5 px-4 py-5">
          <BrandMark />
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">MedAssist AI</span>
        </div>

        {emergencyNumber && (
          <a
            href={`tel:${emergencyNumber}`}
            className="mx-4 mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/70"
          >
            <PhoneIcon className="h-4 w-4 shrink-0" />
            Emergency: {emergencyNumber}
          </a>
        )}

        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {items.map((item) => (
            <NavLink
              key={item.id}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
                )
              }
            >
              <span className="shrink-0" aria-hidden="true">
                {item.icon}
              </span>
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge}
            </NavLink>
          ))}
        </nav>

        {user && (
          <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-800">
            <div className="flex items-center gap-3">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  <UserIcon className="h-4 w-4" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {user.name}
                </p>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                  {user.role ?? user.email}
                </p>
              </div>
            </div>
          </div>
        )}

        {onLogout && (
          <div className="border-t border-gray-100 p-3 dark:border-gray-800">
            <button
              type="button"
              onClick={onLogout}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
            >
              <LogOutIcon className="h-4 w-4" />
              Log out
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

export default Sidebar;
