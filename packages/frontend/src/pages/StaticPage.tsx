import type { ReactNode } from 'react';

export interface StaticPageProps {
  title: string;
  children: ReactNode;
}

/** Generic content page rendered inside `Layout` (via the `<Outlet />` route). */
export default function StaticPage({ title, children }: StaticPageProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
      <div className="space-y-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
        {children}
      </div>
    </div>
  );
}
