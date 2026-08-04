import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { ToastProvider } from '../common/Toast';

export interface AuthLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
}

function BrandMark() {
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600 text-white shadow-lg shadow-primary-600/20">
      <svg viewBox="0 0 20 20" fill="none" className="h-6 w-6" aria-hidden="true">
        <path d="M10 3v14M3 10h14" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
      </svg>
    </div>
  );
}

/**
 * Minimal-chrome layout for login/signup/password-reset pages: centered
 * form card over a soft gradient background, no sidebar/header.
 */
export function AuthLayout({ children, title, subtitle, className }: AuthLayoutProps) {
  return (
    <ToastProvider>
      <div
        className={cn(
          'relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12',
          'bg-gradient-to-br from-primary-50 via-white to-primary-100',
          'dark:from-gray-950 dark:via-gray-900 dark:to-gray-950',
          className
        )}
      >
        <div
          className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary-300/30 blur-3xl dark:bg-primary-700/20"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-primary-400/20 blur-3xl dark:bg-primary-800/20"
          aria-hidden="true"
        />

        <div className="relative w-full max-w-md">
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <BrandMark />
            <span className="text-xl font-bold text-gray-900 dark:text-gray-100">MedAssist AI</span>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-xl dark:border-gray-800 dark:bg-gray-900">
            {(title || subtitle) && (
              <div className="mb-6 text-center">
                {title && (
                  <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
                )}
                {subtitle && (
                  <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
                )}
              </div>
            )}
            {children}
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}

export default AuthLayout;
