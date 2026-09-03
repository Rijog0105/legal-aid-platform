import { useState } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Filter } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useMyProjectAssignment } from '@/features/volunteer/hooks/useMyProjectAssignment';
import { BudgetTab } from '@/features/budget';
import { Spinner } from '@/components/ui';
import { ROUTES } from '@/constants';
import { getProjectLifecycleState } from '@/utils/projectLifecycle';

export function TeamLeadBudgetPage() {
  const { personId } = useAuth();
  const navigate = useNavigate();
  const params = useParams<{ projectId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const targetProjectId = params.projectId || searchParams.get('projectId');

  const { project, allAssignments, isLoading, error, reload } = useMyProjectAssignment(
    personId,
    targetProjectId
  );

  const lifecycle = project ? getProjectLifecycleState(project) : null;
  const defaultPhase = lifecycle?.isSurveyActive ? 'survey' : 'camp';
  const [activePhase, setActivePhase] = useState<'survey' | 'camp'>(defaultPhase);

  const handleProjectSelect = (newProjectId: string) => {
    setSearchParams({ projectId: newProjectId });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2 animate-fade-in pb-12">
      {/* ─── Back Button & Project Selector ─── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={() => navigate(ROUTES.TEAM_LEAD_WORKSPACE)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Back to Team Lead Workspace</span>
        </button>

        {allAssignments.length > 1 && (
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-slate-200 shadow-2xs text-xs">
            <Filter size={13} className="text-slate-400" />
            <span className="font-bold text-slate-600">Assigned Project:</span>
            <select
              value={project?.id ?? ''}
              onChange={(e) => handleProjectSelect(e.target.value)}
              className="bg-transparent font-bold text-indigo-700 focus:outline-none cursor-pointer text-xs"
            >
              {allAssignments.map((item) => (
                <option key={item.camp.id} value={item.camp.id}>
                  {item.camp.camp_name} ({item.camp.status.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ─── Page Title Header ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Team Lead Budget Workspace</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {project ? project.camp_name : 'No assigned project selected'}
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold">
          Team Lead
        </span>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-600 text-center font-medium">
          {error}
        </div>
      )}

      {!project && !isLoading ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-10 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <MapPin size={24} />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Project Assigned</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            You are not currently assigned to a project. Contact your Faculty Coordinator.
          </p>
        </div>
      ) : (
        project && (
          <div className="space-y-4">
            {/* ─── Survey / Camp Phase Segment Switcher ─── */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 w-fit">
              {(['survey', 'camp'] as const).map((phase) => (
                <button
                  key={phase}
                  type="button"
                  onClick={() => setActivePhase(phase)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activePhase === phase
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {phase === 'survey' ? 'Survey Phase Budget' : 'Camp Phase Budget'}
                </button>
              ))}
            </div>

            <BudgetTab
              campId={project.id}
              camp={project}
              phase={activePhase}
              onCampUpdate={reload}
            />
          </div>
        )
      )}
    </div>
  );
}
