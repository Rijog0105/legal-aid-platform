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

  console.log('[RootRedirect] render — isInitialized:', isInitialized, '| isAuthenticated:', isAuthenticated, '| roleName:', roleName);

  if (!isInitialized) {
    console.log('[RootRedirect] → blocking: isInitialized=false, rendering <PageLoader>');
    return <PageLoader message="Loading..." />;
  }

  if (!isAuthenticated) {
    console.log('[RootRedirect] → not authenticated, redirecting to LOGIN');
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  if (roleName === ROLES.VOLUNTEER) {
    console.log('[RootRedirect] → volunteer, redirecting to VOLUNTEER_HOME');
    return <Navigate to={ROUTES.VOLUNTEER_HOME} replace />;
  }

  if (roleName === ROLES.TEAM_LEAD) {
    console.log('[RootRedirect] → team_lead, redirecting to TEAM_LEAD_WORKSPACE');
    return <Navigate to={ROUTES.TEAM_LEAD_WORKSPACE} replace />;
  }

  console.log('[RootRedirect] → redirecting to DASHBOARD');
  return <Navigate to={ROUTES.DASHBOARD} replace />;
}
