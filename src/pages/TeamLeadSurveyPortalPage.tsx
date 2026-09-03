import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useMyProjectAssignment } from '@/features/volunteer/hooks/useMyProjectAssignment';
import { ProjectDetailPage } from '@/features/projects/components/ProjectDetailPage';
import { Spinner } from '@/components/ui';
import { MapPin, ArrowLeft } from 'lucide-react';
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
      <div className="space-y-6 max-w-xl mx-auto py-20 px-4 min-h-screen bg-slate-50 animate-fade-in">
        <button
          onClick={() => navigate(ROUTES.TEAM_LEAD_WORKSPACE)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Back to Workspace</span>
        </button>
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-10 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <MapPin size={24} />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Active Project Assigned</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {error ?? 'You must be assigned to an active project to access survey data.'}
          </p>
        </div>
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
