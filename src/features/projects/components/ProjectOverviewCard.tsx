import { Users, Layers, DollarSign, FileText, CheckCircle, MapPin, Building2, GraduationCap, Globe, BookOpen, Loader2 } from 'lucide-react';
import { Card, ProjectStatusBadge } from '@/components/ui';
import type { Project } from '@/types';
import { PROJECT_ROLE, PROJECT_STATUS } from '@/constants';
import { useProjectPeople } from '@/features/projects/hooks/useProjectPeople';
import { useActivities } from '@/features/activities/hooks/useActivities';
import { useExpenses } from '@/features/budget/hooks/useExpenses';
import { SurveyScheduleCard } from './SurveyScheduleCard';
import { CampScheduleCard } from './CampScheduleCard';
import { formatCurrency } from '@/utils';

interface ProjectOverviewCardProps {
  project: Project;
  onNavigateToSurveySchedule: () => void;
  onNavigateToCampSchedule: () => void;
}

/**
 * Executive dashboard overview for a Legal Aid Project.
 * Read-only. Displays live statistics drawn from existing data hooks.
 * Editing is always redirected to the appropriate phase workspace.
 */
export function ProjectOverviewCard({
  project,
  onNavigateToSurveySchedule,
  onNavigateToCampSchedule,
}: ProjectOverviewCardProps) {
  /* ─── Live Stats ─── */
  const { projectPeople, isLoading: peopleLoading } = useProjectPeople(project.id);
  const { activities, isLoading: activitiesLoading } = useActivities(project.id);
  const { totalSpent, isLoading: budgetLoading } = useExpenses(project.id, project.allocated_budget);

  const volunteerCount = projectPeople.filter((p) => p.camp_role === PROJECT_ROLE.VOLUNTEER).length;
  const teamLeadCount = projectPeople.filter((p) => p.camp_role === PROJECT_ROLE.TEAM_LEAD).length;
  const facultyCount = projectPeople.filter((p) => p.camp_role === PROJECT_ROLE.FACULTY_COORDINATOR).length;
  const totalAssigned = projectPeople.length;

  const completedActivities = activities.filter((a) => a.status === 'completed').length;
  const budgetUsedPercent =
    project.allocated_budget && project.allocated_budget > 0
      ? Math.min(100, Math.round((totalSpent / project.allocated_budget) * 100))
      : 0;

  /* ─── Phase Progress ─── */
  const surveyProgress =
    project.status === PROJECT_STATUS.DRAFT
      ? 0
      : project.status === PROJECT_STATUS.ACTIVE
      ? 60
      : 100;
  const campProgress =
    project.status === PROJECT_STATUS.COMPLETED || project.status === PROJECT_STATUS.ARCHIVED
      ? 100
      : 0;

  function StatCell({
    label,
    value,
    isLoading,
    icon,
    color = 'text-surface-900',
  }: {
    label: string;
    value: string | number;
    isLoading?: boolean;
    icon: React.ReactNode;
    color?: string;
  }) {
    return (
      <div className="bg-surface-50 rounded-xl border border-surface-100 p-3.5 flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-surface-400 block mb-0.5">{label}</span>
          {isLoading ? (
            <Loader2 size={14} className="text-surface-400 animate-spin mt-1" />
          ) : (
            <span className={`text-lg font-extrabold ${color}`}>{value}</span>
          )}
        </div>
        <div className="text-surface-300">{icon}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Row 1: Project Information + Phase Progress ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Project Information */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-surface-100 pb-3">
            <h3 className="text-sm font-bold text-surface-900">Project Information</h3>
            <ProjectStatusBadge status={project.status} />
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
            <div>
              <span className="flex items-center gap-1 text-[10px] text-surface-400 uppercase tracking-wide mb-0.5">
                <MapPin size={10} /> Village
              </span>
              <span className="font-semibold text-surface-800">{project.village_name}</span>
            </div>
            <div>
              <span className="flex items-center gap-1 text-[10px] text-surface-400 uppercase tracking-wide mb-0.5">
                <Building2 size={10} /> Taluk
              </span>
              <span className="font-semibold text-surface-800">{project.taluk}</span>
            </div>
            <div>
              <span className="flex items-center gap-1 text-[10px] text-surface-400 uppercase tracking-wide mb-0.5">
                <Building2 size={10} /> District
              </span>
              <span className="font-semibold text-surface-800">{project.district}</span>
            </div>
            <div>
              <span className="flex items-center gap-1 text-[10px] text-surface-400 uppercase tracking-wide mb-0.5">
                <Globe size={10} /> State
              </span>
              <span className="font-semibold text-surface-800">
                {project.report_settings?.state ?? 'Karnataka'}
              </span>
            </div>
            {project.report_settings?.academic_year && (
              <div>
                <span className="flex items-center gap-1 text-[10px] text-surface-400 uppercase tracking-wide mb-0.5">
                  <BookOpen size={10} /> Academic Year
                </span>
                <span className="font-semibold text-surface-800">
                  {project.report_settings.academic_year}
                </span>
              </div>
            )}
          </div>
          {project.description && (
            <div className="border-t border-surface-100 pt-3">
              <p className="text-xs text-surface-600 leading-relaxed line-clamp-3">{project.description}</p>
            </div>
          )}
        </Card>

        {/* Project Phase Progress */}
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-bold text-surface-900 border-b border-surface-100 pb-3">
            Project Phase Progress
          </h3>

          {/* Survey Progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-surface-700 flex items-center gap-1.5">
                <FileText size={12} className="text-blue-500" />
                Survey Phase
              </span>
              <span className="font-bold text-blue-700">{surveyProgress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-500"
                style={{ width: `${surveyProgress}%` }}
              />
            </div>
          </div>

          {/* Camp Progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-surface-700 flex items-center gap-1.5">
                <Layers size={12} className="text-emerald-500" />
                Camp Phase
              </span>
              <span className="font-bold text-emerald-700">{campProgress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${campProgress}%` }}
              />
            </div>
          </div>

          {/* Budget Progress */}
          {project.allocated_budget && project.allocated_budget > 0 ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-surface-700 flex items-center gap-1.5">
                  <DollarSign size={12} className="text-violet-500" />
                  Budget Used
                </span>
                <span className={`font-bold ${budgetUsedPercent >= 90 ? 'text-red-600' : 'text-violet-700'}`}>
                  {budgetLoading ? '…' : `${budgetUsedPercent}%`}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    budgetUsedPercent >= 90 ? 'bg-red-500' : 'bg-violet-500'
                  }`}
                  style={{ width: `${budgetLoading ? 0 : budgetUsedPercent}%` }}
                />
              </div>
              {!budgetLoading && (
                <p className="text-[10px] text-surface-400">
                  {formatCurrency(totalSpent)} of {formatCurrency(project.allocated_budget)} allocated
                </p>
              )}
            </div>
          ) : null}
        </Card>
      </div>

      {/* ── Row 2: Schedule Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SurveyScheduleCard project={project} onNavigateToSchedule={onNavigateToSurveySchedule} />
        <CampScheduleCard project={project} onNavigateToSchedule={onNavigateToCampSchedule} />
      </div>

      {/* ── Row 3: Quick Statistics ── */}
      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-bold text-surface-900 border-b border-surface-100 pb-3">
          Quick Statistics
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCell
            label="Volunteers"
            value={volunteerCount}
            isLoading={peopleLoading}
            icon={<Users size={18} />}
            color="text-surface-900"
          />
          <StatCell
            label="Team Leads"
            value={teamLeadCount}
            isLoading={peopleLoading}
            icon={<GraduationCap size={18} />}
            color="text-primary-700"
          />
          <StatCell
            label="Faculty"
            value={facultyCount}
            isLoading={peopleLoading}
            icon={<Users size={18} />}
            color="text-violet-700"
          />
          <StatCell
            label="Total Assigned"
            value={totalAssigned}
            isLoading={peopleLoading}
            icon={<Users size={18} />}
            color="text-surface-900"
          />
          <StatCell
            label="Activities"
            value={`${completedActivities}/${activities.length}`}
            isLoading={activitiesLoading}
            icon={<CheckCircle size={18} />}
            color="text-emerald-700"
          />
          <StatCell
            label="Budget Spent"
            value={budgetLoading ? '…' : formatCurrency(totalSpent)}
            isLoading={false}
            icon={<DollarSign size={18} />}
            color={budgetUsedPercent >= 90 ? 'text-red-600' : 'text-violet-700'}
          />
        </div>
      </Card>
    </div>
  );
}
