import { Suspense } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { ErrorBoundary } from './ErrorBoundary';
import { Loader } from './common/Loader';
import { CalendarIcon, CheckCircleIcon, HomeIcon, SearchIcon, UserIcon } from './common/icons';
import { Layout } from './layout/Layout';
import type { AppUser, NavItem } from './layout/types';
import { useAuth, type AuthUser } from '../context/AuthContext';
import { NotificationToastBridge } from '../context/NotificationToastBridge';
import { DoctorProvider, useDoctorData } from '../context/DoctorContext';
import { EMERGENCY_NUMBER } from '../config/env';
import { FOOTER_LINKS, SOCIAL_LINKS } from '../pages/demoData';

const DOCTOR_NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    to: '/doctor',
    icon: <HomeIcon className="h-5 w-5" />,
    end: true,
  },
  {
    id: 'reports',
    label: 'Report Review',
    to: '/doctor/reports',
    icon: <CheckCircleIcon className="h-5 w-5" />,
  },
  {
    id: 'appointments',
    label: 'Appointments',
    to: '/doctor/appointments',
    icon: <CalendarIcon className="h-5 w-5" />,
  },
  {
    id: 'patients',
    label: 'Patient History',
    to: '/doctor/patients',
    icon: <SearchIcon className="h-5 w-5" />,
  },
  {
    id: 'profile',
    label: 'Profile',
    to: '/doctor/profile',
    icon: <UserIcon className="h-5 w-5" />,
  },
];

const ROLE_LABEL: Record<AuthUser['role'], string> = {
  patient: 'Patient',
  doctor: 'Doctor',
  guest: 'Guest',
};

function PageSkeleton() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader size="lg" text="Loading page…" />
    </div>
  );
}

function DoctorAppShellInner() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  // No /doctor/notifications endpoint exists — pending-report count doubles
  // as the bell badge, since that's the thing most likely to need attention.
  const { stats } = useDoctorData();

  const appUser: AppUser | undefined = user
    ? { name: user.name, email: user.email, role: ROLE_LABEL[user.role] }
    : undefined;

  return (
    <Layout
      navItems={DOCTOR_NAV_ITEMS}
      user={appUser}
      onLogout={async () => {
        await logout();
        navigate('/login', { replace: true });
      }}
      notificationCount={stats?.pending ?? 0}
      onNotificationsClick={() => navigate('/doctor/reports')}
      emergencyNumber={EMERGENCY_NUMBER}
      footerLinks={FOOTER_LINKS}
      socialLinks={SOCIAL_LINKS}
    >
      <ErrorBoundary>
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </ErrorBoundary>
      <NotificationToastBridge />
    </Layout>
  );
}

/** Route element for the authenticated doctor section: DoctorProvider + Layout + Outlet. */
export default function DoctorAppShell() {
  return (
    <DoctorProvider>
      <DoctorAppShellInner />
    </DoctorProvider>
  );
}
