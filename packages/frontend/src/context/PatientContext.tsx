import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getErrorMessage } from '../lib/api';
import * as patientApi from '../lib/endpoints/patient';
import type { PatientNotification, PatientProfile, PatientStats } from '../types/patient';

interface PatientContextValue {
  stats: PatientStats | null;
  isLoadingStats: boolean;
  statsError: string | null;
  refetchStats: () => Promise<void>;

  notifications: PatientNotification[];
  unreadCount: number;
  isLoadingNotifications: boolean;
  notificationsError: string | null;
  refetchNotifications: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;

  profile: PatientProfile | null;
  isLoadingProfile: boolean;
  refetchProfile: () => Promise<void>;
}

const PatientContext = createContext<PatientContextValue | null>(null);

/**
 * Patient-scoped data shared across the patient pages (stats, notification
 * bell count, profile) so they're fetched once per session instead of once
 * per page. Mount inside a patient-authenticated route only.
 */
export function PatientProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<PatientStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<PatientNotification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);

  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const refetchStats = useCallback(async () => {
    setIsLoadingStats(true);
    setStatsError(null);
    try {
      setStats(await patientApi.getStats());
    } catch (err) {
      setStatsError(getErrorMessage(err, 'Could not load your stats.'));
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  const refetchNotifications = useCallback(async () => {
    setIsLoadingNotifications(true);
    setNotificationsError(null);
    try {
      setNotifications(await patientApi.getNotifications());
    } catch (err) {
      setNotificationsError(getErrorMessage(err, 'Could not load notifications.'));
    } finally {
      setIsLoadingNotifications(false);
    }
  }, []);

  const refetchProfile = useCallback(async () => {
    setIsLoadingProfile(true);
    try {
      setProfile(await patientApi.getProfile());
    } catch {
      setProfile(null);
    } finally {
      setIsLoadingProfile(false);
    }
  }, []);

  const markAsRead = useCallback(async (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.notificationid === id ? { ...n, is_read: true } : n))
    );
    try {
      await patientApi.markNotificationRead(id);
    } catch {
      // Non-critical: worst case the badge re-syncs on next refetch.
    }
  }, []);

  useEffect(() => {
    void refetchStats();
    void refetchNotifications();
    void refetchProfile();
  }, [refetchStats, refetchNotifications, refetchProfile]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  const value = useMemo<PatientContextValue>(
    () => ({
      stats,
      isLoadingStats,
      statsError,
      refetchStats,
      notifications,
      unreadCount,
      isLoadingNotifications,
      notificationsError,
      refetchNotifications,
      markAsRead,
      profile,
      isLoadingProfile,
      refetchProfile,
    }),
    [
      stats,
      isLoadingStats,
      statsError,
      refetchStats,
      notifications,
      unreadCount,
      isLoadingNotifications,
      notificationsError,
      refetchNotifications,
      markAsRead,
      profile,
      isLoadingProfile,
      refetchProfile,
    ]
  );

  return <PatientContext.Provider value={value}>{children}</PatientContext.Provider>;
}

export function usePatientData(): PatientContextValue {
  const ctx = useContext(PatientContext);
  if (!ctx) throw new Error('usePatientData must be used within a <PatientProvider>');
  return ctx;
}
