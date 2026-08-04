import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  Card,
  Input,
  Skeleton,
  SkeletonCard,
  SkeletonText,
} from '../../components/common';
import {
  BellIcon,
  CalendarIcon,
  ClockIcon,
  PhoneIcon,
  SearchIcon,
  UserIcon,
} from '../../components/common/icons';
import { useAuth } from '../../context/AuthContext';
import { usePatientData } from '../../context/PatientContext';
import { EMERGENCY_NUMBER } from '../../config/env';
import { getErrorMessage } from '../../lib/api';
import { getPatientAppointments } from '../../lib/endpoints/appointments';
import { getReports } from '../../lib/endpoints/patient';
import type { PatientAppointment, PatientReport } from '../../types/patient';

const STATUS_BADGE: Record<
  PatientReport['status'],
  { variant: 'warning' | 'success'; label: string }
> = {
  PENDING: { variant: 'warning', label: 'Pending review' },
  REVIEWED: { variant: 'success', label: 'Reviewed' },
};

export default function Dashboard() {
  const { user } = useAuth();
  const { stats, isLoadingStats, statsError, notifications, isLoadingNotifications } =
    usePatientData();
  const navigate = useNavigate();

  const [quickSymptoms, setQuickSymptoms] = useState('');
  const [reports, setReports] = useState<PatientReport[] | null>(null);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<PatientAppointment[] | null>(null);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);

  useEffect(() => {
    getReports()
      .then(setReports)
      .catch((err) => setReportsError(getErrorMessage(err, 'Could not load recent reports.')));
    getPatientAppointments()
      .then(setAppointments)
      .catch((err) => setAppointmentsError(getErrorMessage(err, 'Could not load appointments.')));
  }, []);

  const handleQuickCheck = (e: FormEvent) => {
    e.preventDefault();
    if (!quickSymptoms.trim()) return;
    navigate('/symptom-checker', { state: { symptoms: quickSymptoms } });
  };

  const recentReports = reports?.slice(0, 3) ?? [];
  const upcoming = (appointments ?? [])
    .filter(
      (a) =>
        a.status === 'SCHEDULED' &&
        new Date(a.appointment_date) >= new Date(new Date().toDateString())
    )
    .slice(0, 3);

  const isEmergencyRisk =
    !!stats &&
    (stats.emergencyCount > 0 ||
      stats.severityScore === 'CRITICAL' ||
      stats.severityScore === 'SEVERE');

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Here&apos;s what&apos;s happening with your health.
        </p>
      </header>

      {isEmergencyRisk && (
        <Alert
          type="error"
          title="Elevated risk detected"
          description={
            <>
              Recent activity on your account indicates a {stats?.severityScore.toLowerCase()}{' '}
              severity level. If you&apos;re experiencing a medical emergency, call{' '}
              <a href={`tel:${EMERGENCY_NUMBER}`} className="font-semibold underline">
                {EMERGENCY_NUMBER}
              </a>{' '}
              immediately.
            </>
          }
        />
      )}

      {statsError && <Alert type="warning" description={statsError} />}

      <section
        aria-label="Statistics"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {isLoadingStats
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : [
              {
                id: 'reports',
                label: 'Reports',
                value: stats?.totalReports ?? 0,
                icon: <ClockIcon className="h-5 w-5" />,
              },
              {
                id: 'appointments',
                label: 'Appointments',
                value: stats?.totalAppointments ?? 0,
                icon: <CalendarIcon className="h-5 w-5" />,
              },
              {
                id: 'pending',
                label: 'Pending',
                value: stats?.pendingReports ?? 0,
                icon: <BellIcon className="h-5 w-5" />,
              },
              {
                id: 'emergencies',
                label: 'Emergencies',
                value: stats?.emergencyCount ?? 0,
                icon: <PhoneIcon className="h-5 w-5" />,
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

      <section aria-label="Quick symptom checker">
        <Card>
          <Card.Header>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
              Quick symptom checker
            </h2>
          </Card.Header>
          <Card.Body>
            <form onSubmit={handleQuickCheck} className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={quickSymptoms}
                onChange={(e) => setQuickSymptoms(e.target.value)}
                placeholder="Describe how you're feeling…"
                leftIcon={<SearchIcon className="h-4 w-4" />}
                containerClassName="flex-1"
              />
              <Button type="submit" disabled={!quickSymptoms.trim()}>
                Analyze
              </Button>
            </form>
          </Card.Body>
        </Card>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card padding="none">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Recent reports</h2>
            <Link
              to="/history"
              className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
            >
              View all
            </Link>
          </div>
          {reportsError ? (
            <div className="p-5">
              <Alert type="warning" description={reportsError} />
            </div>
          ) : reports === null ? (
            <div className="space-y-4 p-5">
              <SkeletonText lines={3} />
            </div>
          ) : recentReports.length === 0 ? (
            <p className="p-5 text-sm text-gray-400">
              No reports yet. Try the symptom checker above.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {recentReports.map((report) => (
                <li key={report.reportid}>
                  <Link
                    to={`/reports/${report.reportid}`}
                    className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                        {report.ai_diagnosis}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {report.created_date}
                      </p>
                    </div>
                    <Badge variant={STATUS_BADGE[report.status].variant} size="sm">
                      {STATUS_BADGE[report.status].label}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card padding="none">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
              Upcoming appointments
            </h2>
            <Link
              to="/appointments"
              className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
            >
              View all
            </Link>
          </div>
          {appointmentsError ? (
            <div className="p-5">
              <Alert type="warning" description={appointmentsError} />
            </div>
          ) : appointments === null ? (
            <div className="space-y-4 p-5">
              <SkeletonText lines={3} />
            </div>
          ) : upcoming.length === 0 ? (
            <div className="p-5 text-center">
              <p className="mb-3 text-sm text-gray-400">No upcoming appointments.</p>
              <Button size="sm" variant="outline" onClick={() => navigate('/appointments/book')}>
                Book an appointment
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {upcoming.map((appt) => (
                <li key={appt.slotid} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    <UserIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                      Dr. {appt.doctor_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {appt.appointment_date} at {appt.appointment_time}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card padding="none">
        <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Notifications</h2>
        </div>
        {isLoadingNotifications ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <p className="p-5 text-sm text-gray-400">You&apos;re all caught up.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {notifications.slice(0, 5).map((n) => (
              <li key={n.notificationid} className="flex items-start gap-3 px-5 py-3 text-sm">
                <span
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${n.is_read ? 'bg-transparent' : 'bg-primary-600'}`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={
                      n.is_read
                        ? 'text-gray-500 dark:text-gray-400'
                        : 'font-medium text-gray-900 dark:text-gray-100'
                    }
                  >
                    {n.message}
                  </p>
                  <p className="text-xs text-gray-400">{n.sent_at}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
