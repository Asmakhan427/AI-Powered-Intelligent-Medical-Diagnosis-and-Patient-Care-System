import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  Card,
  SkeletonCard,
  SkeletonText,
  useToast,
} from '../../components/common';
import { CalendarIcon, CheckCircleIcon, ClockIcon, UserIcon } from '../../components/common/icons';
import { useAuth } from '../../context/AuthContext';
import { useDoctorData } from '../../context/DoctorContext';
import { getErrorMessage } from '../../lib/api';
import * as doctorApi from '../../lib/endpoints/doctor';
import { derivePatientRoster } from '../../lib/endpoints/doctorPatients';
import type {
  DoctorAppointment,
  DoctorPendingReport,
  DoctorReviewedReport,
} from '../../types/doctor';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function DoctorDashboard() {
  const { user } = useAuth();
  const { stats, isLoadingStats, statsError, profile, refetchProfile, setProfile } =
    useDoctorData();
  const toast = useToast();
  const navigate = useNavigate();

  const [pending, setPending] = useState<DoctorPendingReport[] | null>(null);
  const [reviewed, setReviewed] = useState<DoctorReviewedReport[] | null>(null);
  const [appointments, setAppointments] = useState<DoctorAppointment[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [togglingAvailability, setTogglingAvailability] = useState(false);

  useEffect(() => {
    Promise.all([
      doctorApi.getPendingReports(),
      doctorApi.getReviewedReports(),
      doctorApi.getAppointments(),
    ])
      .then(([p, r, a]) => {
        setPending(p);
        setReviewed(r);
        setAppointments(a);
      })
      .catch((err) => setListError(getErrorMessage(err, 'Could not load your dashboard data.')));
  }, []);

  const handleToggleAvailability = async () => {
    if (!profile) return;
    setTogglingAvailability(true);
    try {
      const updated = await doctorApi.updateAvailability({ isAvailable: !profile.is_available });
      setProfile({ ...profile, is_available: updated.is_available });
      toast.success(
        updated.is_available
          ? "You're now marked as available."
          : "You're now marked as unavailable."
      );
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update your availability.'));
    } finally {
      setTogglingAvailability(false);
    }
  };

  useEffect(() => {
    if (!profile) void refetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patientCount =
    pending && reviewed && appointments
      ? derivePatientRoster(pending, reviewed, appointments).length
      : null;
  const todaysAppointments = (appointments ?? []).filter(
    (a) => a.appointment_date === todayStr() && a.status === 'SCHEDULED'
  );
  const recentPending = (pending ?? []).slice(0, 5);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Welcome back{user?.name ? `, Dr. ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Here&apos;s your practice at a glance.
          </p>
        </div>

        {profile && (
          <button
            type="button"
            onClick={handleToggleAvailability}
            disabled={togglingAvailability}
            className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium shadow-sm transition-colors disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900"
          >
            <span
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${profile.is_available ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${profile.is_available ? 'translate-x-[18px]' : 'translate-x-0.5'}`}
              />
            </span>
            {profile.is_available ? 'Available' : 'Unavailable'}
          </button>
        )}
      </header>

      {statsError && <Alert type="warning" description={statsError} />}
      {listError && <Alert type="warning" description={listError} />}

      <section
        aria-label="Statistics"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {isLoadingStats || patientCount === null
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : [
              {
                id: 'pending',
                label: 'Pending',
                value: stats?.pending ?? 0,
                icon: <ClockIcon className="h-5 w-5" />,
              },
              {
                id: 'reviewed',
                label: 'Reviewed',
                value: stats?.reviewed ?? 0,
                icon: <CheckCircleIcon className="h-5 w-5" />,
              },
              {
                id: 'appointments',
                label: 'Appointments',
                value: stats?.upcomingAppointments ?? 0,
                icon: <CalendarIcon className="h-5 w-5" />,
              },
              {
                id: 'patients',
                label: 'Patients',
                value: patientCount,
                icon: <UserIcon className="h-5 w-5" />,
              },
            ].map((stat) => (
              <Card key={stat.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                    <p className="mt-1.5 text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {stat.value}
                    </p>
                  </div>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                    {stat.icon}
                  </span>
                </div>
              </Card>
            ))}
      </section>

      <section aria-label="Quick actions" className="flex flex-wrap gap-3">
        <Button
          leftIcon={<CheckCircleIcon className="h-4 w-4" />}
          onClick={() => navigate('/doctor/reports')}
        >
          Review reports
        </Button>
        <Button
          variant="outline"
          leftIcon={<CalendarIcon className="h-4 w-4" />}
          onClick={() => navigate('/doctor/appointments')}
        >
          View appointments
        </Button>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card padding="none">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
              Recent pending reports
            </h2>
            <button
              onClick={() => navigate('/doctor/reports')}
              className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
            >
              View all
            </button>
          </div>
          {pending === null ? (
            <div className="space-y-4 p-5">
              <SkeletonText lines={3} />
            </div>
          ) : recentPending.length === 0 ? (
            <p className="p-5 text-sm text-gray-400">
              No pending reports. You&apos;re all caught up.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {recentPending.map((report) => (
                <li
                  key={report.reportid}
                  className="flex items-center justify-between gap-3 px-5 py-3.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                      {report.patient_name}
                    </p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                      {report.ai_diagnosis}
                    </p>
                  </div>
                  <Badge variant="warning" size="sm">
                    {report.ai_confidence}%
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card padding="none">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
              Today&apos;s appointments
            </h2>
          </div>
          {appointments === null ? (
            <div className="space-y-4 p-5">
              <SkeletonText lines={3} />
            </div>
          ) : todaysAppointments.length === 0 ? (
            <p className="p-5 text-sm text-gray-400">No appointments scheduled for today.</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {todaysAppointments.map((appt) => (
                <li key={appt.slotid} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    <UserIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                      {appt.patient_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {appt.appointment_time}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
