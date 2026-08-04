import { forwardRef, useState, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { AlertTriangleIcon, CheckCircleIcon, InfoIcon, XCircleIcon, XIcon } from './icons';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  type?: AlertType;
  title?: ReactNode;
  description?: ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  icon?: ReactNode;
}

const TYPE_CONFIG: Record<AlertType, { classes: string; icon: ReactNode }> = {
  success: {
    classes: 'bg-green-50 border-green-200 text-green-800',
    icon: <CheckCircleIcon className="h-5 w-5 text-green-500" />,
  },
  error: {
    classes: 'bg-red-50 border-red-200 text-red-800',
    icon: <XCircleIcon className="h-5 w-5 text-red-500" />,
  },
  warning: {
    classes: 'bg-amber-50 border-amber-200 text-amber-800',
    icon: <AlertTriangleIcon className="h-5 w-5 text-amber-500" />,
  },
  info: {
    classes: 'bg-sky-50 border-sky-200 text-sky-800',
    icon: <InfoIcon className="h-5 w-5 text-sky-500" />,
  },
};

export const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  {
    type = 'info',
    title,
    description,
    dismissible = false,
    onDismiss,
    icon,
    className,
    children,
    ...rest
  },
  ref
) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const config = TYPE_CONFIG[type];

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      ref={ref}
      role="alert"
      className={cn('flex gap-3 rounded-lg border p-4', config.classes, className)}
      {...rest}
    >
      <div className="mt-0.5 shrink-0">{icon ?? config.icon}</div>
      <div className="flex-1 text-sm">
        {title && <p className="font-semibold">{title}</p>}
        {description && <p className={cn(title && 'mt-0.5', 'opacity-90')}>{description}</p>}
        {children}
      </div>
      {dismissible && (
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss alert"
          className="shrink-0 rounded-md p-0.5 opacity-60 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
        >
          <XIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
});

export default Alert;
