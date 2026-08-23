import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useMyProjectAssignment } from '@/features/volunteer/hooks/useMyProjectAssignment';
import { ProjectDetailPage } from '@/features/projects/components/ProjectDetailPage';
import { Spinner, Card } from '@/components/ui';
import { MapPin, ChevronLeft } from 'lucide-react';
import { ROUTES } from '@/constants';

export function TeamLeadSurveyPortalPage() {
  const { personId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { project, isLoading, error } = useMyProjectAssignment(personId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20 bg-slate-50 min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="space-y-6 max-w-xl mx-auto py-20 px-4 min-h-screen bg-slate-50">
        <button
          onClick={() => navigate(ROUTES.TEAM_LEAD_WORKSPACE)}
          className="flex items-center gap-1 text-sm text-surface-500 hover:text-surface-700 transition-colors cursor-pointer"
        >
          <ChevronLeft size={16} />
          Back to Workspace
        </button>
        <Card className="p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-surface-100 text-surface-400 flex items-center justify-center mx-auto">
            <MapPin size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-surface-800">No Active Project Assigned</h3>
            <p className="text-xs text-surface-500 max-w-md mx-auto">
              {error ?? 'You must be assigned to an active project/camp to view survey data.'}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const subTab = location.pathname.includes('/reports') ? 'forms' : 'dashboard';

  return (
    <ProjectDetailPage
      projectId={project.id}
      initialMainTab="survey"
      initialSurveySubTab={subTab}
      isTeamLeadView={true}
    />
  );
}
