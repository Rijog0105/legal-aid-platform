import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ROUTES, ROLES } from '@/constants';

/* Layouts */
import { AppShell } from '@/components/layout/AppShell';
import { VolunteerLayout } from '@/components/layout/VolunteerLayout';

/* Guards */
import { ProtectedRoute } from '@/components/guards/ProtectedRoute';
import { RootRedirect } from '@/components/guards/RootRedirect';

/* Pages */
import { LoginPage } from '@/features/auth/components/LoginPage';
import { UnauthorizedPage } from '@/pages/UnauthorizedPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { PeoplePage } from '@/features/people';
import { VolunteerHomePage } from '@/pages/VolunteerHomePage';

export const router = createBrowserRouter([
  /* ─── Root: smart redirect ─── */
  {
    path: ROUTES.HOME,
    element: <RootRedirect />,
  },

  /* ─── Public Routes ─── */
  {
    path: ROUTES.LOGIN,
    element: <LoginPage />,
  },
  {
    path: ROUTES.UNAUTHORIZED,
    element: <UnauthorizedPage />,
  },

  /* ─── Faculty / Admin Routes ─── */
  {
    element: (
      <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.FACULTY, ROLES.TEAM_LEAD]}>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      {
        path: ROUTES.DASHBOARD,
        element: <DashboardPage />,
      },
      {
        path: ROUTES.PEOPLE,
        element: <PeoplePage />,
      },
      {
        path: ROUTES.CAMPS,
        element: <div className="text-surface-500">Camp list — Phase 4</div>,
      },
      {
        path: ROUTES.CAMP_CREATE,
        element: <div className="text-surface-500">Create camp — Phase 4</div>,
      },
      {
        path: ROUTES.CAMP_DETAIL,
        element: <div className="text-surface-500">Camp detail — Phase 4</div>,
      },
    ],
  },

  /* ─── Volunteer Routes ─── */
  {
    element: (
      <ProtectedRoute allowedRoles={[ROLES.VOLUNTEER]}>
        <VolunteerLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: ROUTES.VOLUNTEER_HOME,
        element: <VolunteerHomePage />,
      },
      {
        path: ROUTES.VOLUNTEER_CAPTURE,
        element: <div className="text-surface-500 text-center py-12">Photo capture — Phase 6</div>,
      },
      {
        path: ROUTES.VOLUNTEER_SUBMISSIONS,
        element: <div className="text-surface-500 text-center py-12">My submissions — Phase 6</div>,
      },
    ],
  },

  /* ─── Catch-all ─── */
  {
    path: '*',
    element: <Navigate to={ROUTES.LOGIN} replace />,
  },
]);
