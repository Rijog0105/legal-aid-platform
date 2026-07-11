import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { PageLoader } from '@/components/ui';
import { ROUTES } from '@/constants';
import type { RoleName } from '@/constants';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: RoleName[];
}

/**
 * Route guard that redirects unauthenticated users to login
 * and unauthorized users to the unauthorized page.
 */
export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isInitialized, isLoading, roleName } = useAuth();

  /* Still loading auth state */
  if (!isInitialized || isLoading) {
    return <PageLoader message="Loading..." />;
  }

  /* Not logged in */
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  /* Role check */
  if (allowedRoles && roleName && !allowedRoles.includes(roleName)) {
    return <Navigate to={ROUTES.UNAUTHORIZED} replace />;
  }

  return <>{children}</>;
}
