import type { ReactNode } from 'react';
import { Button, type ButtonVariant } from '../common/Button';
import { Card } from '../common/Card';
import { Layout, type LayoutProps } from './Layout';

export interface StatItem {
  id: string;
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: { label: string; direction: 'up' | 'down' | 'neutral' };
}

export interface QuickAction {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: ButtonVariant;
}

export interface ActivityItem {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  icon?: ReactNode;
}

export interface DashboardLayoutProps extends Omit<LayoutProps, 'children'> {
  stats?: StatItem[];
  quickActions?: QuickAction[];
  activity?: ActivityItem[];
  /** Extra content rendered below the standard dashboard sections. */
  children?: ReactNode;
}

const TREND_CLASSES: Record<NonNullable<StatItem['trend']>['direction'], string> = {
  up: 'text-green-600 dark:text-green-400',
  down: 'text-red-600 dark:text-red-400',
  neutral: 'text-gray-500 dark:text-gray-400',
};

/**
 * Ready-to-use dashboard page: stats grid, quick actions and a recent
 * activity feed, wrapped in the standard `Layout` (Sidebar + Header + Footer).
 */
export function DashboardLayout({
  stats,
  quickActions,
  activity,
  children,
  ...layoutProps
}: DashboardLayoutProps) {
  return (
    <Layout {...layoutProps}>
      <div className="space-y-8">
        {stats && stats.length > 0 && (
          <section
            aria-label="Statistics"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {stats.map((stat) => (
              <Card key={stat.id} padding="md">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                    <p className="mt-1.5 text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {stat.value}
                    </p>
                    {stat.trend && (
                      <p
                        className={`mt-1 text-xs font-medium ${TREND_CLASSES[stat.trend.direction]}`}
                      >
                        {stat.trend.label}
                      </p>
                    )}
                  </div>
                  {stat.icon && (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                      {stat.icon}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </section>
        )}

        {quickActions && quickActions.length > 0 && (
          <section aria-label="Quick actions">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Quick actions
            </h2>
            <div className="flex flex-wrap gap-3">
              {quickActions.map((action) => (
                <Button
                  key={action.id}
                  variant={action.variant ?? 'outline'}
                  leftIcon={action.icon}
                  onClick={action.onClick}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </section>
        )}

        {activity && activity.length > 0 && (
          <section aria-label="Recent activity">
            <Card padding="none">
              <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">Recent activity</h2>
              </div>
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {activity.map((item) => (
                  <li key={item.id} className="flex items-start gap-3 px-5 py-3.5">
                    {item.icon && (
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        {item.icon}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {item.title}
                      </p>
                      {item.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <time className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                      {item.timestamp}
                    </time>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        )}

        {children}
      </div>
    </Layout>
  );
}

export default DashboardLayout;
