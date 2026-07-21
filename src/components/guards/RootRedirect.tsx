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
  const { isInitialized, isLoading, isAuthenticated, roleName, profile } = useAuth();

  console.log(
    '[RootRedirect] RENDER — isInitialized:', isInitialized,
    '| isLoading:', isLoading,
    '| isAuthenticated:', isAuthenticated,
    '| profile:', profile,
    '| roleName:', roleName
  );

  if (!isInitialized || isLoading) {
    console.log('[RootRedirect] → BLOCKING rendering: isInitialized or isLoading is true. Rendering <PageLoader>');
    return <PageLoader message="Loading..." />;
  }

  if (!isAuthenticated || !profile || !roleName) {
    console.log('[RootRedirect] → REASON FOR ROUTE SELECTION: Missing session/profile/role (isAuthenticated:', isAuthenticated, 'profile:', profile, 'roleName:', roleName, '). NAVIGATE TO LOGIN');
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  if (roleName === ROLES.VOLUNTEER) {
    console.log('[RootRedirect] → REASON FOR ROUTE SELECTION: roleName === VOLUNTEER. NAVIGATE TO VOLUNTEER_HOME');
    return <Navigate to={ROUTES.VOLUNTEER_HOME} replace />;
  }

  if (roleName === ROLES.TEAM_LEAD) {
    console.log('[RootRedirect] → REASON FOR ROUTE SELECTION: roleName === TEAM_LEAD. NAVIGATE TO TEAM_LEAD_WORKSPACE');
    return <Navigate to={ROUTES.TEAM_LEAD_WORKSPACE} replace />;
  }

  if (roleName === ROLES.FACULTY || roleName === ROLES.ADMIN) {
    console.log('[RootRedirect] → REASON FOR ROUTE SELECTION: roleName === FACULTY or ADMIN. NAVIGATE TO DASHBOARD');
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  console.log('[RootRedirect] → REASON FOR ROUTE SELECTION: Unknown or unmapped roleName (', roleName, '). NAVIGATE TO UNAUTHORIZED');
  return <Navigate to={ROUTES.UNAUTHORIZED} replace />;
}
