import { useState, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { ToastProvider } from '../common/Toast';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Footer, type FooterLink, type SocialLink } from './Footer';
import type { AppUser, NavItem } from './types';

export interface LayoutProps {
  /** Rendered in the main content area. Falls back to `<Outlet />` for nested react-router routes. */
  children?: ReactNode;
  navItems: NavItem[];
  user?: AppUser;
  onLogout?: () => void;
  onProfileClick?: () => void;
  notificationCount?: number;
  onNotificationsClick?: () => void;
  searchable?: boolean;
  onSearch?: (query: string) => void;
  emergencyNumber?: string;
  footerLinks?: FooterLink[];
  socialLinks?: SocialLink[];
  className?: string;
}

/**
 * Authenticated app shell: Sidebar + Header + main content + Footer, with a
 * toast viewport so any page rendered inside can call `useToast()`.
 */
export function Layout({
  children,
  navItems,
  user,
  onLogout,
  onProfileClick,
  notificationCount,
  onNotificationsClick,
  searchable,
  onSearch,
  emergencyNumber,
  footerLinks,
  socialLinks,
  className,
}: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ToastProvider>
      <div className={cn('flex min-h-screen bg-gray-50 dark:bg-gray-950', className)}>
        <Sidebar
          items={navItems}
          user={user}
          onLogout={onLogout}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          emergencyNumber={emergencyNumber}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <Header
            onMenuClick={() => setSidebarOpen(true)}
            user={user}
            onProfileClick={onProfileClick}
            onLogout={onLogout}
            notificationCount={notificationCount}
            onNotificationsClick={onNotificationsClick}
            searchable={searchable}
            onSearch={onSearch}
            emergencyNumber={emergencyNumber}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl">{children ?? <Outlet />}</div>
          </main>

          <Footer emergencyNumber={emergencyNumber} links={footerLinks} socialLinks={socialLinks} />
        </div>
      </div>
    </ToastProvider>
  );
}

export default Layout;
