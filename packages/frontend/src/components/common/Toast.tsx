import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn';
import { AlertTriangleIcon, CheckCircleIcon, InfoIcon, XCircleIcon, XIcon } from './icons';

export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

export interface ToastOptions {
  type?: ToastType;
  title?: ReactNode;
  message: ReactNode;
  duration?: number;
  position?: ToastPosition;
}

interface ToastRecord extends Required<Omit<ToastOptions, 'title'>> {
  id: string;
  title?: ReactNode;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => string;
  success: (message: ReactNode, options?: Omit<ToastOptions, 'type' | 'message'>) => string;
  error: (message: ReactNode, options?: Omit<ToastOptions, 'type' | 'message'>) => string;
  warning: (message: ReactNode, options?: Omit<ToastOptions, 'type' | 'message'>) => string;
  info: (message: ReactNode, options?: Omit<ToastOptions, 'type' | 'message'>) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a <ToastProvider>');
  return ctx;
}

const TYPE_CONFIG: Record<ToastType, { classes: string; icon: ReactNode }> = {
  success: {
    classes: 'bg-white border-green-200',
    icon: <CheckCircleIcon className="h-5 w-5 text-green-500" />,
  },
  error: {
    classes: 'bg-white border-red-200',
    icon: <XCircleIcon className="h-5 w-5 text-red-500" />,
  },
  warning: {
    classes: 'bg-white border-amber-200',
    icon: <AlertTriangleIcon className="h-5 w-5 text-amber-500" />,
  },
  info: {
    classes: 'bg-white border-sky-200',
    icon: <InfoIcon className="h-5 w-5 text-sky-500" />,
  },
};

const POSITION_CLASSES: Record<ToastPosition, string> = {
  'top-right': 'top-4 right-4 items-end',
  'top-left': 'top-4 left-4 items-start',
  'bottom-right': 'bottom-4 right-4 items-end flex-col-reverse',
  'bottom-left': 'bottom-4 left-4 items-start flex-col-reverse',
};

const ANIMATION_CLASSES: Record<ToastPosition, string> = {
  'top-right': 'animate-slide-in-right',
  'bottom-right': 'animate-slide-in-right',
  'top-left': 'animate-slide-in-left',
  'bottom-left': 'animate-slide-in-left',
};

function ToastCard({ toast, onDismiss }: { toast: ToastRecord; onDismiss: (id: string) => void }) {
  const config = TYPE_CONFIG[toast.type];
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'pointer-events-auto flex w-80 max-w-[calc(100vw-2rem)] gap-3 rounded-lg border p-4 shadow-lg',
        ANIMATION_CLASSES[toast.position],
        config.classes
      )}
    >
      <div className="mt-0.5 shrink-0">{config.icon}</div>
      <div className="flex-1 text-sm">
        {toast.title && <p className="font-semibold text-gray-900">{toast.title}</p>}
        <p className="text-gray-600">{toast.message}</p>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="shrink-0 rounded-md p-0.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (options: ToastOptions) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const record: ToastRecord = {
        id,
        type: options.type ?? 'info',
        title: options.title,
        message: options.message,
        duration: options.duration ?? 4000,
        position: options.position ?? 'top-right',
      };
      setToasts((prev) => [...prev, record]);

      if (record.duration > 0) {
        const timer = setTimeout(() => dismiss(id), record.duration);
        timers.current.set(id, timer);
      }
      return id;
    },
    [dismiss]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (message, options) => toast({ ...options, type: 'success', message }),
      error: (message, options) => toast({ ...options, type: 'error', message }),
      warning: (message, options) => toast({ ...options, type: 'warning', message }),
      info: (message, options) => toast({ ...options, type: 'info', message }),
      dismiss,
    }),
    [toast, dismiss]
  );

  const positions = useMemo(() => {
    const grouped = new Map<ToastPosition, ToastRecord[]>();
    for (const t of toasts) {
      grouped.set(t.position, [...(grouped.get(t.position) ?? []), t]);
    }
    return grouped;
  }, [toasts]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <>
            {Array.from(positions.entries()).map(([position, items]) => (
              <div
                key={position}
                className={cn(
                  'pointer-events-none fixed z-[60] flex gap-2',
                  POSITION_CLASSES[position]
                )}
              >
                {items.map((t) => (
                  <ToastCard key={t.id} toast={t} onDismiss={dismiss} />
                ))}
              </div>
            ))}
          </>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

export default ToastProvider;
