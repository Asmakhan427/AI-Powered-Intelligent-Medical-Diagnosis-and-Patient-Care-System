import type { CSSProperties } from 'react';
import { cn } from '../../lib/cn';

export interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
}

/** Base pulsing placeholder block — compose with width/height utility classes. */
export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-gray-200 dark:bg-gray-800', className)}
      style={style}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({
  lines = 3,
  className,
  lastLineWidth = '60%',
}: {
  lines?: number;
  className?: string;
  lastLineWidth?: string;
}) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3.5"
          style={i === lines - 1 ? { width: lastLineWidth } : undefined}
        />
      ))}
    </div>
  );
}

export function SkeletonAvatar({
  size = 'h-10 w-10',
  className,
}: {
  size?: string;
  className?: string;
}) {
  return <Skeleton className={cn('shrink-0 rounded-full', size, className)} />;
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900',
        className
      )}
    >
      <Skeleton className="mb-3 h-4 w-1/3" />
      <Skeleton className="mb-2 h-7 w-1/2" />
      <Skeleton className="h-3 w-1/4" />
    </div>
  );
}

export function SkeletonTableRows({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800" aria-hidden="true">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-3 py-3.5">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
