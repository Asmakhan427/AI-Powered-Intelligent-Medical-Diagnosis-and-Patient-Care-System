import { useEffect, useRef } from 'react';
import { useNotifications } from './NotificationContext';
import { useToast } from '../components/common/Toast';

/**
 * Shows a toast for each newly-arrived real-time notification. Must be
 * rendered somewhere that's a descendant of *both* `<NotificationProvider>`
 * (mounted once at the app root) and a `<ToastProvider>` (mounted per-shell)
 * — e.g. inside `PatientAppShell`/`DoctorAppShell`, not at the root itself,
 * since `useToast()` only resolves against a provider *below* it in the tree.
 */
export function NotificationToastBridge(): null {
  const { notifications } = useNotifications();
  const toast = useToast();
  // null until the first effect run, which seeds it without toasting —
  // whatever's already in the list when this mounts is backlog, not "new".
  const seenIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (seenIds.current === null) {
      seenIds.current = new Set(notifications.map((n) => n.id));
      return;
    }
    for (const notification of notifications) {
      if (seenIds.current.has(notification.id)) continue;
      seenIds.current.add(notification.id);
      toast[notification.type](notification.body, { title: notification.title });
    }
  }, [notifications, toast]);

  return null;
}

export default NotificationToastBridge;
