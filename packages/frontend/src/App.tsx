import { lazy } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import PatientAppShell from './components/PatientAppShell';
import DoctorAppShell from './components/DoctorAppShell';
import { ProtectedRoute } from './components/ProtectedRoute';
import ComponentsShowcasePage from './pages/ComponentsShowcasePage';
import StaticPage from './pages/StaticPage';
import NotFoundPage from './pages/NotFoundPage';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import GuestLogin from './pages/auth/GuestLogin';
import AuthCallback from './pages/auth/AuthCallback';
import {
  DEMO_USER,
  EMERGENCY_NUMBER,
  FOOTER_LINKS,
  NAV_ITEMS,
  SOCIAL_LINKS,
} from './pages/demoData';

// Code-split both role-specific sections — most visitors hit an auth page
// first, so neither needs to ship in the initial bundle. Each *AppShell
// wraps its Outlet in one Suspense/ErrorBoundary pair for its pages.
const Dashboard = lazy(() => import('./pages/patient/Dashboard'));
const SymptomChecker = lazy(() => import('./pages/patient/SymptomChecker'));
const MedicalHistory = lazy(() => import('./pages/patient/MedicalHistory'));
const AppointmentBooking = lazy(() => import('./pages/patient/AppointmentBooking'));
const AppointmentList = lazy(() => import('./pages/patient/AppointmentList'));
const ReportView = lazy(() => import('./pages/patient/ReportView'));
const Education = lazy(() => import('./pages/patient/Education'));
const Feedback = lazy(() => import('./pages/patient/Feedback'));

const DoctorDashboard = lazy(() => import('./pages/doctor/DoctorDashboard'));
const ReportReview = lazy(() => import('./pages/doctor/ReportReview'));
const AppointmentManager = lazy(() => import('./pages/doctor/AppointmentManager'));
const PatientHistory = lazy(() => import('./pages/doctor/PatientHistory'));
const DoctorProfile = lazy(() => import('./pages/doctor/DoctorProfile'));

/**
 * Routing tree:
 * - `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/guest`,
 *   `/auth/callback` — public auth pages (AuthLayout, chrome-free).
 * - `/`, `/history`, `/appointments*`, `/reports/:id`, `/education`,
 *   `/feedback` — the patient app (patient role only) wrapped in
 *   `PatientAppShell`. `/symptom-checker` sits one level up in the same
 *   shell, open to `patient` *and* `guest` — it's the one thing guests are
 *   promised on the GuestLogin page, so it can't be patient-only.
 * - `/doctor`, `/doctor/reports`, `/doctor/appointments`, `/doctor/patients`,
 *   `/doctor/profile` — the doctor app (doctor role only), `DoctorAppShell`.
 * - `/about`, `/privacy`, `/terms` — static pages sharing one `Layout`
 *   instance via nested routes (its `<Outlet />` fallback).
 * - `/components` — the common/ component-library showcase.
 */
export default function App() {
  const navigate = useNavigate();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/guest" element={<GuestLogin />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route path="/components" element={<ComponentsShowcasePage />} />

      <Route element={<ProtectedRoute allowedRoles={['patient', 'guest']} />}>
        <Route element={<PatientAppShell />}>
          <Route path="symptom-checker" element={<SymptomChecker />} />

          <Route element={<ProtectedRoute allowedRoles={['patient']} />}>
            <Route index element={<Dashboard />} />
            <Route path="history" element={<MedicalHistory />} />
            <Route path="appointments" element={<AppointmentList />} />
            <Route path="appointments/book" element={<AppointmentBooking />} />
            <Route path="reports/:id" element={<ReportView />} />
            <Route path="education" element={<Education />} />
            <Route path="feedback" element={<Feedback />} />
          </Route>
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['doctor']} />}>
        <Route path="/doctor" element={<DoctorAppShell />}>
          <Route index element={<DoctorDashboard />} />
          <Route path="reports" element={<ReportReview />} />
          <Route path="appointments" element={<AppointmentManager />} />
          <Route path="patients" element={<PatientHistory />} />
          <Route path="profile" element={<DoctorProfile />} />
        </Route>
      </Route>

      <Route
        element={
          <Layout
            navItems={NAV_ITEMS}
            user={DEMO_USER}
            onLogout={() => navigate('/login')}
            emergencyNumber={EMERGENCY_NUMBER}
            footerLinks={FOOTER_LINKS}
            socialLinks={SOCIAL_LINKS}
          />
        }
      >
        <Route
          path="/about"
          element={
            <StaticPage title="About MedAssist AI">
              <p>
                MedAssist AI provides AI-assisted preliminary symptom analysis and connects patients
                with the right specialist. It is not a substitute for professional medical
                diagnosis.
              </p>
            </StaticPage>
          }
        />
        <Route
          path="/privacy"
          element={
            <StaticPage title="Privacy Policy">
              <p>
                We only collect the information needed to provide care coordination and never sell
                patient data to third parties.
              </p>
            </StaticPage>
          }
        />
        <Route
          path="/terms"
          element={
            <StaticPage title="Terms of Service">
              <p>
                By using MedAssist AI you agree to use the platform responsibly and acknowledge that
                it does not replace emergency care.
              </p>
            </StaticPage>
          }
        />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
