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

  console.log('[ProtectedRoute] render — isInitialized:', isInitialized, '| isLoading:', isLoading, '| isAuthenticated:', isAuthenticated, '| roleName:', roleName, '| allowedRoles:', allowedRoles);

  /* Still loading auth state */
  if (!isInitialized) {
    console.log('[ProtectedRoute] → blocking: isInitialized=false, rendering <PageLoader>');
    return <PageLoader message="Loading..." />;
  }

  /* Not logged in */
  if (!isAuthenticated) {
    console.log('[ProtectedRoute] → not authenticated, redirecting to LOGIN');
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  /* Role check */
  if (allowedRoles && roleName && !allowedRoles.includes(roleName)) {
    console.log('[ProtectedRoute] → role mismatch (roleName:', roleName, ', allowed:', allowedRoles, '), redirecting to UNAUTHORIZED');
    return <Navigate to={ROUTES.UNAUTHORIZED} replace />;
  }

  console.log('[ProtectedRoute] → access granted, rendering children');
  return <>{children}</>;
}
