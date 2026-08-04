import { useState, type FormEvent } from 'react';
import { cn } from '../../lib/cn';
import { Badge } from '../common/Badge';
import { Dropdown, type DropdownItem } from '../common/Dropdown';
import {
  BellIcon,
  LogOutIcon,
  MenuIcon,
  MoonIcon,
  PhoneIcon,
  SearchIcon,
  SunIcon,
  UserIcon,
} from '../common/icons';
import { useThemeStore } from '../../store/theme.store';
import type { AppUser } from './types';

export interface HeaderProps {
  onMenuClick: () => void;
  user?: AppUser;
  notificationCount?: number;
  onNotificationsClick?: () => void;
  onProfileClick?: () => void;
  onLogout?: () => void;
  emergencyNumber?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  className?: string;
}

export function Header({
  onMenuClick,
  user,
  notificationCount = 0,
  onNotificationsClick,
  onProfileClick,
  onLogout,
  emergencyNumber,
  searchable = false,
  searchPlaceholder = 'Search…',
  onSearch,
  className,
}: HeaderProps) {
  const { theme, toggleTheme } = useThemeStore();
  const [query, setQuery] = useState('');

  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSearch?.(query);
  };

  const avatarMenuItems: DropdownItem[] = [
    {
      type: 'item',
      id: 'profile',
      label: 'Your profile',
      icon: <UserIcon className="h-4 w-4" />,
      onClick: onProfileClick,
    },
    ...(onLogout
      ? ([
          { type: 'divider', id: 'd1' },
          {
            type: 'item',
            id: 'logout',
            label: 'Log out',
            icon: <LogOutIcon className="h-4 w-4" />,
            onClick: onLogout,
          },
        ] as DropdownItem[])
      : []),
  ];

  return (
    <header
      className={cn(
        'flex h-16 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 sm:px-6',
        'dark:border-gray-800 dark:bg-gray-900',
        'print:hidden',
        className
      )}
    >
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open navigation menu"
        className="rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 md:hidden"
      >
        <MenuIcon className="h-5 w-5" />
      </button>

      <span className="font-semibold text-gray-900 dark:text-gray-100 md:hidden">MedAssist AI</span>

      {searchable && (
        <form onSubmit={handleSearchSubmit} className="hidden flex-1 max-w-sm md:block">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label="Search"
              className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:bg-gray-800"
            />
          </div>
        </form>
      )}

      <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
        {emergencyNumber && (
          <a
            href={`tel:${emergencyNumber}`}
            className="hidden items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/70 sm:flex"
          >
            <PhoneIcon className="h-4 w-4" />
            {emergencyNumber}
          </a>
        )}

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          {theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
        </button>

        <button
          type="button"
          onClick={onNotificationsClick}
          aria-label={`Notifications${notificationCount > 0 ? ` (${notificationCount} unread)` : ''}`}
          className="relative rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <BellIcon className="h-5 w-5" />
          {notificationCount > 0 && (
            <Badge
              variant="danger"
              size="sm"
              className="absolute -right-0.5 -top-0.5 min-w-[1.1rem] justify-center px-1"
            >
              {notificationCount > 9 ? '9+' : notificationCount}
            </Badge>
          )}
        </button>

        {user && (
          <Dropdown
            align="right"
            items={avatarMenuItems}
            trigger={
              <button
                type="button"
                aria-label="Account menu"
                className="flex items-center gap-2 rounded-full p-0.5 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    <UserIcon className="h-4 w-4" />
                  </span>
                )}
              </button>
            }
          />
        )}
      </div>
    </header>
  );
}

export default Header;
