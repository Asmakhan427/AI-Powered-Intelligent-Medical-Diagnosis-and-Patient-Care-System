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
import * as doctorApi from '../lib/endpoints/doctor';
import type { DoctorProfileData, DoctorStats } from '../types/doctor';

interface DoctorContextValue {
  stats: DoctorStats | null;
  isLoadingStats: boolean;
  statsError: string | null;
  refetchStats: () => Promise<void>;

  profile: DoctorProfileData | null;
  isLoadingProfile: boolean;
  refetchProfile: () => Promise<void>;
  /** Updates the cached profile in place after a successful edit, without a round-trip. */
  setProfile: (profile: DoctorProfileData) => void;
}

const DoctorContext = createContext<DoctorContextValue | null>(null);

/**
 * Doctor-scoped data shared across the doctor pages (stats, profile —
 * including availability, which the Header/Dashboard both surface).
 * There's no `/doctor/notifications` endpoint, so unlike PatientProvider
 * this has no notification list; the Header's bell falls back to showing
 * the pending-reports count as a proxy.
 */
export function DoctorProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<DoctorStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [profile, setProfileState] = useState<DoctorProfileData | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const refetchStats = useCallback(async () => {
    setIsLoadingStats(true);
    setStatsError(null);
    try {
      setStats(await doctorApi.getStats());
    } catch (err) {
      setStatsError(getErrorMessage(err, 'Could not load your stats.'));
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  const refetchProfile = useCallback(async () => {
    setIsLoadingProfile(true);
    try {
      setProfileState(await doctorApi.getProfile());
    } catch {
      setProfileState(null);
    } finally {
      setIsLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    void refetchStats();
    void refetchProfile();
  }, [refetchStats, refetchProfile]);

  const value = useMemo<DoctorContextValue>(
    () => ({
      stats,
      isLoadingStats,
      statsError,
      refetchStats,
      profile,
      isLoadingProfile,
      refetchProfile,
      setProfile: setProfileState,
    }),
    [stats, isLoadingStats, statsError, refetchStats, profile, isLoadingProfile, refetchProfile]
  );

  return <DoctorContext.Provider value={value}>{children}</DoctorContext.Provider>;
}

export function useDoctorData(): DoctorContextValue {
  const ctx = useContext(DoctorContext);
  if (!ctx) throw new Error('useDoctorData must be used within a <DoctorProvider>');
  return ctx;
}
