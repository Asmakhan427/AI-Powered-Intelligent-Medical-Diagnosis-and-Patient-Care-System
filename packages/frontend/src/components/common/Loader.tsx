import { cn } from '../../lib/cn';

export type LoaderSize = 'sm' | 'md' | 'lg';
export type LoaderVariant = 'spinner' | 'dots' | 'bar';

export interface LoaderProps {
  size?: LoaderSize;
  variant?: LoaderVariant;
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

const SPINNER_SIZE: Record<LoaderSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

const DOT_SIZE: Record<LoaderSize, string> = {
  sm: 'h-1.5 w-1.5',
  md: 'h-2.5 w-2.5',
  lg: 'h-3.5 w-3.5',
};

const BAR_HEIGHT: Record<LoaderSize, string> = {
  sm: 'h-1',
  md: 'h-1.5',
  lg: 'h-2',
};

const TEXT_SIZE: Record<LoaderSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

function Spinner({ size }: { size: LoaderSize }) {
  return (
    <svg
      className={cn('animate-spin text-primary-600', SPINNER_SIZE[size])}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function Dots({ size }: { size: LoaderSize }) {
  return (
    <div className="flex items-center gap-1.5" role="status" aria-hidden="true">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className={cn('animate-bounce rounded-full bg-primary-600', DOT_SIZE[size])}
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}

function Bar({ size }: { size: LoaderSize }) {
  return (
    <div
      className={cn('w-32 overflow-hidden rounded-full bg-primary-100', BAR_HEIGHT[size])}
      role="status"
      aria-hidden="true"
    >
      <div className="h-full w-full origin-left animate-loading-bar rounded-full bg-primary-600" />
    </div>
  );
}

/**
 * Loading indicator. Set `fullScreen` for a fixed, full-viewport overlay
 * (e.g. while a route/data fetch is in flight).
 */
export function Loader({
  size = 'md',
  variant = 'spinner',
  text,
  fullScreen = false,
  className,
}: LoaderProps) {
  const content = (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      {variant === 'spinner' && <Spinner size={size} />}
      {variant === 'dots' && <Dots size={size} />}
      {variant === 'bar' && <Bar size={size} />}
      {text && <p className={cn('text-gray-600', TEXT_SIZE[size])}>{text}</p>}
      <span className="sr-only">Loading…</span>
    </div>
  );

  if (!fullScreen) return content;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
      {content}
    </div>
  );
}

export default Loader;
