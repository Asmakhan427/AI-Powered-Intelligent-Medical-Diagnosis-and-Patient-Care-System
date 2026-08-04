import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  /** Renders a small status dot instead of / alongside text content. */
  dot?: boolean;
  /** Renders a numeric count, capped by `max` (e.g. "99+"). Overrides children when set. */
  count?: number;
  max?: number;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  primary: 'bg-primary-100 text-primary-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-sky-100 text-sky-700',
};

const DOT_COLOR_CLASSES: Record<BadgeVariant, string> = {
  primary: 'bg-primary-500',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-sky-500',
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: 'text-[11px] px-1.5 py-0.5 gap-1',
  md: 'text-xs px-2 py-0.5 gap-1.5',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { variant = 'primary', size = 'md', dot = false, count, max = 99, className, children, ...rest },
  ref
) {
  const content = count !== undefined ? (count > max ? `${max}+` : count) : children;

  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-full font-medium leading-none',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className
      )}
      {...rest}
    >
      {dot && (
        <span
          className={cn('inline-block h-1.5 w-1.5 rounded-full', DOT_COLOR_CLASSES[variant])}
          aria-hidden="true"
        />
      )}
      {content}
    </span>
  );
});

export default Badge;
