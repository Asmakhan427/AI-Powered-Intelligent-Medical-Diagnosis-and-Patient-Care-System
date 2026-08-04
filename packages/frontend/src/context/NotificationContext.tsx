import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { SOCKET_EVENTS } from '../services/socket.service';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  createdAt: string;
  read: boolean;
}

export type NewNotificationInput = Omit<AppNotification, 'id' | 'read' | 'createdAt'> &
  Partial<Pick<AppNotification, 'id' | 'createdAt'>>;

export interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  isConnected: boolean;
  addNotification: (input: NewNotificationInput) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

// Matches packages/backend/src/sockets/notification.socket.ts's NotificationPayload.
interface IncomingNotificationPayload {
  id?: string;
  title: string;
  body: string;
  type?: string;
  createdAt?: string;
}

/**
 * App-wide, real-time notification feed — distinct from the
 * REST-backed `PatientContext`/`DoctorContext` notification lists (those
 * reflect the persisted NotificationLog table for one role). This is the
 * live push channel: connects over WebSocket while authenticated and turns
 * `notification:new` server events into in-memory notifications immediately,
 * no page refresh or refetch needed. Mount once near the app root, inside
 * `<AuthProvider>` (it needs `isAuthenticated` to know when to connect).
 */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const { isConnected, subscribe } = useWebSocket(isAuthenticated);

  const addNotification = useCallback((input: NewNotificationInput) => {
    const notification: AppNotification = {
      id:
        input.id ??
        (typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`),
      title: input.title,
      body: input.body,
      type: input.type,
      createdAt: input.createdAt ?? new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => [notification, ...prev]);
  }, []);

  useEffect(() => {
    // `subscribe`'s reference never changes (see useWebSocket.ts) and it
    // deliberately won't force a connection, so re-run this once `isConnected`
    // flips to true — otherwise a subscribe attempted before the socket
    // exists yet would silently never (re)attach.
    if (!isConnected) return;
    return subscribe<IncomingNotificationPayload>(SOCKET_EVENTS.NOTIFICATION, (payload) => {
      const type: NotificationType = ['info', 'success', 'warning', 'error'].includes(
        payload.type ?? ''
      )
        ? (payload.type as NotificationType)
        : 'info';
      addNotification({
        id: payload.id,
        title: payload.title,
        body: payload.body,
        type,
        createdAt: payload.createdAt,
      });
    });
  }, [isConnected, subscribe, addNotification]);

  // Clear out when signing out so the next session (possibly a different user on the same device) starts clean.
  useEffect(() => {
    if (!isAuthenticated) setNotifications([]);
  }, [isAuthenticated]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => setNotifications([]), []);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount,
      isConnected,
      addNotification,
      removeNotification,
      markAsRead,
      markAllAsRead,
      clearAll,
    }),
    [
      notifications,
      unreadCount,
      isConnected,
      addNotification,
      removeNotification,
      markAsRead,
      markAllAsRead,
      clearAll,
    ]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within a <NotificationProvider>');
  return ctx;
}

/**
 * Bridges live notifications to visible toasts. `NotificationProvider` is
 * mounted at the app root (above any `<ToastProvider>`, which live per-shell
 * — see components/layout/Layout.tsx), so it can't call `useToast()` itself;
 * mount this instead from *inside* a shell that has both, e.g.
 * `PatientAppShell`/`DoctorAppShell`.
 */
export { NotificationToastBridge } from './NotificationToastBridge';
