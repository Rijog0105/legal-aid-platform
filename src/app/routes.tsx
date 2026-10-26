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
import { RegisterPage } from '@/features/auth/components/RegisterPage';
import { ForgotPasswordPage } from '@/features/auth/components/ForgotPasswordPage';
import { UnauthorizedPage } from '@/pages/UnauthorizedPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { PeoplePage } from '@/features/people';
import { ProjectListPage, ProjectCreatePage, ProjectDetailPage } from '@/features/projects';
import { VolunteerHomePage } from '@/pages/VolunteerHomePage';
import { VolunteerCapturePage, MySubmissionsPage, TeamLeadPhotosPage } from '@/features/volunteer';
import { TeamLeadWorkspacePage } from '@/pages/TeamLeadWorkspacePage';
import { TeamLeadBudgetPage } from '@/pages/TeamLeadBudgetPage';
import { TeamLeadSurveyPortalPage } from '@/pages/TeamLeadSurveyPortalPage';
import { FacultySurveyDashboard } from '@/features/reports/components/FacultySurveyDashboard';
import { VolunteerSurveyPage } from '@/pages/VolunteerSurveyPage';
import { VolunteerSurveyReportsPage } from '@/pages/VolunteerSurveyReportsPage';
import { DevTestSurveyPage } from '@/pages/DevTestSurveyPage';
import { SurveyDetailsPage } from '@/pages/SurveyDetailsPage';

export const router = createBrowserRouter([
  /* ─── Root: smart redirect ─── */
  {
    path: ROUTES.HOME,
    element: <RootRedirect />,
  },

  /* ─── Public Routes ─── */
  {
    path: '/dev/test-survey',
    element: <DevTestSurveyPage />,
  },
  {
    path: ROUTES.LOGIN,
    element: <LoginPage />,
  },
  {
    path: ROUTES.REGISTER,
    element: <RegisterPage />,
  },
  {
    path: ROUTES.FORGOT_PASSWORD,
    element: <ForgotPasswordPage />,
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
        path: ROUTES.PROJECTS,
        element: <ProjectListPage />,
      },
      {
        path: ROUTES.PROJECT_CREATE,
        element: <ProjectCreatePage />,
      },
      {
        path: ROUTES.PROJECT_DETAIL,
        element: <ProjectDetailPage />,
      },
      {
        path: ROUTES.SURVEYS,
        element: <FacultySurveyDashboard />,
      },
      {
        path: '/faculty/surveys/:surveyId',
        element: <SurveyDetailsPage />,
      },
      {
        path: ROUTES.REPORTS,
        element: <FacultySurveyDashboard />,
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
        element: <TeamLeadSurveyPortalPage />,
      },
      {
        path: ROUTES.TEAM_LEAD_REPORTS,
        element: <TeamLeadSurveyPortalPage />,
      },
      {
        path: ROUTES.TEAM_LEAD_BUDGET,
        element: <TeamLeadBudgetPage />,
      },
      {
        path: ROUTES.TEAM_LEAD_BUDGET + '/:campId',
        element: <TeamLeadBudgetPage />,
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
      {
        path: ROUTES.VOLUNTEER_SURVEY,
        element: <VolunteerSurveyPage />,
      },
      {
        path: ROUTES.VOLUNTEER_REPORTS,
        element: <VolunteerSurveyReportsPage />,
      },
    ],
  },

  /* ─── Catch-all ─── */
  {
    path: '*',
    element: <Navigate to={ROUTES.LOGIN} replace />,
  },
]);
