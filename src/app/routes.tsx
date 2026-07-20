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
import { CampListPage, CampCreatePage, CampDetailPage } from '@/features/camps';
import { VolunteerHomePage } from '@/pages/VolunteerHomePage';
import { VolunteerCapturePage, MySubmissionsPage, TeamLeadPhotosPage } from '@/features/volunteer';
import { TeamLeadWorkspacePage } from '@/pages/TeamLeadWorkspacePage';
import { TeamLeadPlaceholderPage } from '@/pages/TeamLeadPlaceholderPage';

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
      <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.FACULTY]}>
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
        element: <CampListPage />,
      },
      {
        path: ROUTES.CAMP_CREATE,
        element: <CampCreatePage />,
      },
      {
        path: ROUTES.CAMP_DETAIL,
        element: <CampDetailPage />,
      },
    ],
  },

  /* ─── Team Lead Routes ─── */
  {
    element: (
      <ProtectedRoute allowedRoles={[ROLES.TEAM_LEAD]}>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      {
        path: ROUTES.TEAM_LEAD_WORKSPACE,
        element: <TeamLeadWorkspacePage />,
      },
      {
        path: ROUTES.TEAM_LEAD_PHOTOS,
        element: <TeamLeadPhotosPage />,
      },
      {
        path: ROUTES.TEAM_LEAD_SURVEYS,
        element: (
          <TeamLeadPlaceholderPage
            title="Survey Dashboard"
            description="Centralized survey status tracking showing completed and pending beneficiary forms collected during camp."
            targetPhase="Phase 7 (Survey Integration)"
          />
        ),
      },
      {
        path: ROUTES.TEAM_LEAD_REPORTS,
        element: (
          <TeamLeadPlaceholderPage
            title="Survey Reports"
            description="Access to individual beneficiary survey outputs and consolidated survey statistics."
            targetPhase="Phase 8 (Report Generation)"
          />
        ),
      },
      {
        path: ROUTES.TEAM_LEAD_BUDGET,
        element: (
          <TeamLeadPlaceholderPage
            title="Budget"
            description="Team lead view of requested, approved, and actual camp expenditure items."
            targetPhase="Phase 7 (Budget Module)"
          />
        ),
      },
    ],
  },

  /* ─── Volunteer Routes (inherited by Team Lead) ─── */
  {
    element: (
      <ProtectedRoute allowedRoles={[ROLES.VOLUNTEER, ROLES.TEAM_LEAD]}>
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
        element: <VolunteerCapturePage />,
      },
      {
        path: ROUTES.VOLUNTEER_SUBMISSIONS,
        element: <MySubmissionsPage />,
      },
    ],
  },

  /* ─── Catch-all ─── */
  {
    path: '*',
    element: <Navigate to={ROUTES.LOGIN} replace />,
  },
]);
