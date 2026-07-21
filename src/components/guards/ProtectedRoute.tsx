import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { PageLoader } from '@/components/ui';
import { ROUTES } from '@/constants';
import type { RoleName } from '@/constants';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: RoleName[];
}

/**
 * Route guard that redirects unauthenticated users or users with missing/unresolved
 * profiles to login, and unauthorized users to the unauthorized page.
 */
export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isInitialized, isLoading, roleName, profile } = useAuth();
  const location = useLocation();

  console.log(
    '[ProtectedRoute] RENDER — pathname:', location.pathname,
    '| isInitialized:', isInitialized,
    '| isLoading:', isLoading,
    '| isAuthenticated:', isAuthenticated,
    '| roleName:', roleName,
    '| profile:', profile,
    '| allowedRoles:', allowedRoles
  );

  /* Still loading auth state or profile resolution */
  if (!isInitialized || isLoading) {
    console.log('[ProtectedRoute] → BLOCKING rendering: isInitialized or isLoading is true. Rendering <PageLoader>');
    return <PageLoader message="Loading..." />;
  }

  /* Not logged in or missing profile/role */
  if (!isAuthenticated || !profile || !roleName) {
    console.log('[ProtectedRoute] → NAVIGATE TO LOGIN: missing session/profile/role (isAuthenticated:', isAuthenticated, 'profile:', profile, 'roleName:', roleName, ')');
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  /* Role check */
  if (allowedRoles && !allowedRoles.includes(roleName)) {
    console.log('[ProtectedRoute] → NAVIGATE TO UNAUTHORIZED: role mismatch (roleName:', roleName, ', allowedRoles:', allowedRoles, ')');
    return <Navigate to={ROUTES.UNAUTHORIZED} replace />;
  }

  console.log('[ProtectedRoute] → ACCESS GRANTED for pathname:', location.pathname, 'roleName:', roleName);
  return <>{children}</>;
}
