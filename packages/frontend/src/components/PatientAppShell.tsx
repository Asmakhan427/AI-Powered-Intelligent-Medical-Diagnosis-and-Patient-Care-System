import { Suspense } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { ErrorBoundary } from './ErrorBoundary';
import { Loader } from './common/Loader';
import { CalendarIcon, ClockIcon, HomeIcon, InfoIcon, SearchIcon, StarIcon } from './common/icons';
import { Layout } from './layout/Layout';
import type { AppUser, NavItem } from './layout/types';
import { useAuth, type AuthUser } from '../context/AuthContext';
import { NotificationToastBridge } from '../context/NotificationToastBridge';
import { PatientProvider, usePatientData } from '../context/PatientContext';
import { EMERGENCY_NUMBER } from '../config/env';
import { FOOTER_LINKS, SOCIAL_LINKS } from '../pages/demoData';

const PATIENT_NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    to: '/',
    icon: <HomeIcon className="h-5 w-5" />,
    end: true,
  },
  {
    id: 'symptom-checker',
    label: 'Symptom Checker',
    to: '/symptom-checker',
    icon: <SearchIcon className="h-5 w-5" />,
  },
  {
    id: 'history',
    label: 'Medical History',
    to: '/history',
    icon: <ClockIcon className="h-5 w-5" />,
  },
  {
    id: 'appointments',
    label: 'Appointments',
    to: '/appointments',
    icon: <CalendarIcon className="h-5 w-5" />,
  },
  { id: 'education', label: 'Education', to: '/education', icon: <InfoIcon className="h-5 w-5" /> },
  { id: 'feedback', label: 'Feedback', to: '/feedback', icon: <StarIcon className="h-5 w-5" /> },
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

function PatientAppShellInner() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { unreadCount } = usePatientData();

  const appUser: AppUser | undefined = user
    ? { name: user.name, email: user.email, role: ROLE_LABEL[user.role] }
    : undefined;

  return (
    <Layout
      navItems={PATIENT_NAV_ITEMS}
      user={appUser}
      onLogout={async () => {
        await logout();
        navigate('/login', { replace: true });
      }}
      notificationCount={unreadCount}
      onNotificationsClick={() => navigate('/')}
      emergencyNumber={EMERGENCY_NUMBER}
      footerLinks={FOOTER_LINKS}
      socialLinks={SOCIAL_LINKS}
    >
      {/* One shared Suspense/ErrorBoundary for every lazy-loaded patient
          page, instead of repeating it at each <Route element>. */}
      <ErrorBoundary>
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </ErrorBoundary>
      {/* Descendant of both NotificationProvider (app root) and this
          Layout's ToastProvider — see NotificationToastBridge's doc comment. */}
      <NotificationToastBridge />
    </Layout>
  );
}

/** Route element for the authenticated patient section: PatientProvider + Layout + Outlet. */
export default function PatientAppShell() {
  return (
    <PatientProvider>
      <PatientAppShellInner />
    </PatientProvider>
  );
}
