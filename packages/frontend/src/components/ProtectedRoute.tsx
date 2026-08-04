import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader } from './common/Loader';
import { ROLE_HOME, useAuth, type AuthUser } from '../context/AuthContext';

export interface ProtectedRouteProps {
  /** Restricts access to specific roles; omit to allow any authenticated user. */
  allowedRoles?: AuthUser['role'][];
  /** Where an authorized-but-wrong-role user is sent; defaults to *their own* role home so it can't loop. */
  redirectTo?: string;
}

/**
 * Route guard: waits out the boot-time session check, redirects to /login
 * (preserving the attempted path so Login can send the user back) if
 * unauthenticated, and optionally restricts by role.
 */
export function ProtectedRoute({ allowedRoles, redirectTo }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader size="lg" text="Loading your session…" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to={redirectTo ?? ROLE_HOME[user.role]} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
