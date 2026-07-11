import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { PageLoader } from '@/components/ui';
import { ROLES, ROUTES } from '@/constants';

/**
 * Handles the root '/' route.
 * - While auth is initializing: show loader.
 * - Authenticated volunteer → /volunteer
 * - Authenticated faculty/admin/team_lead → /dashboard
 * - Unauthenticated → /login
 */
export function RootRedirect() {
  const { isInitialized, isAuthenticated, roleName } = useAuth();

  if (!isInitialized) {
    return <PageLoader message="Loading..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  if (roleName === ROLES.VOLUNTEER) {
    return <Navigate to={ROUTES.VOLUNTEER_HOME} replace />;
  }

  return <Navigate to={ROUTES.DASHBOARD} replace />;
}
