import { useState, useEffect } from 'react';
import { Users, Layers, DollarSign, FileText, CheckCircle, MapPin, Building2, GraduationCap, Globe, BookOpen, Loader2, ArrowRight, ClipboardCheck } from 'lucide-react';
import { Card, ProjectStatusBadge } from '@/components/ui';
import type { Project } from '@/types';
import { PROJECT_ROLE, PROJECT_STATUS } from '@/constants';
import { useProjectPeople } from '@/features/projects/hooks/useProjectPeople';
import { useActivities } from '@/features/activities/hooks/useActivities';
import { useExpenses } from '@/features/budget/hooks/useExpenses';
import { SurveyScheduleCard } from './SurveyScheduleCard';
import { CampScheduleCard } from './CampScheduleCard';
import { formatCurrency } from '@/utils';
import { fetchProjectAttendanceOverview } from '@/features/attendance/services/attendanceService';

interface ProjectOverviewCardProps {
  project: Project;
  onNavigateToSurveySchedule: () => void;
  onNavigateToCampSchedule: () => void;
  onNavigateToAttendance: (phase: 'survey' | 'camp') => void;
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
  onNavigateToAttendance,
}: ProjectOverviewCardProps) {
  /* ─── Live Stats ─── */
  const [attendanceOverview, setAttendanceOverview] = useState<{
    surveyCheckIn: string;
    surveyCheckOut: string;
    campCheckIn: string;
    campCheckOut: string;
    overallPercentage: number | null;
  } | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  useEffect(() => {
    async function loadAttendance() {
      try {
        const data = await fetchProjectAttendanceOverview(project.id);
        setAttendanceOverview(data);
      } catch (err) {
        console.error('Failed to load project attendance overview:', err);
      } finally {
        setLoadingOverview(false);
      }
    }
    loadAttendance();
  }, [project.id]);
  const { projectPeople, isLoading: peopleLoading } = useProjectPeople(project.id);
  const { activities, isLoading: activitiesLoading } = useActivities(project.id);

  const { totalSpent: surveySpent, isLoading: surveyBudgetLoading } = useExpenses(
    project.id,
    'survey',
    project.allocated_budget_survey
  );
  const { totalSpent: campSpent, isLoading: campBudgetLoading } = useExpenses(
    project.id,
    'camp',
    project.allocated_budget_camp
  );

  const volunteerCount = projectPeople.filter((p) => p.camp_role === PROJECT_ROLE.VOLUNTEER).length;
  const teamLeadCount = projectPeople.filter((p) => p.camp_role === PROJECT_ROLE.TEAM_LEAD).length;
  const facultyCount = projectPeople.filter((p) => p.camp_role === PROJECT_ROLE.FACULTY_COORDINATOR).length;
  const totalAssigned = projectPeople.length;

  const completedActivities = activities.filter((a) => a.status === 'completed').length;

  const surveyAllocated = project.allocated_budget_survey ?? 0;
  const surveyRemaining = surveyAllocated - surveySpent;

  const campAllocated = project.allocated_budget_camp ?? 0;
  const campRemaining = campAllocated - campSpent;

  const overallAllocated = surveyAllocated + campAllocated;
  const overallSpent = surveySpent + campSpent;
  const overallRemaining = overallAllocated - overallSpent;

  const overallUsedPercent =
    overallAllocated > 0 ? Math.min(100, Math.round((overallSpent / overallAllocated) * 100)) : 0;

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
          {overallAllocated > 0 ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-surface-700 flex items-center gap-1.5">
                  <DollarSign size={12} className="text-violet-500" />
                  Budget Used (Overall)
                </span>
                <span className={`font-bold ${overallUsedPercent >= 90 ? 'text-red-600' : 'text-violet-700'}`}>
                  {surveyBudgetLoading || campBudgetLoading ? '…' : `${overallUsedPercent}%`}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    overallUsedPercent >= 90 ? 'bg-red-500' : 'bg-violet-500'
                  }`}
                  style={{ width: `${surveyBudgetLoading || campBudgetLoading ? 0 : overallUsedPercent}%` }}
                />
              </div>
              {!(surveyBudgetLoading || campBudgetLoading) && (
                <p className="text-[10px] text-surface-400">
                  {formatCurrency(overallSpent)} of {formatCurrency(overallAllocated)} allocated
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

      {/* ── Compact Attendance Overview Card ── */}
      <Card className="p-5 space-y-4 bg-white">
        <div className="flex items-center justify-between border-b border-surface-100 pb-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary-600" />
            <h3 className="text-sm font-bold text-surface-900">Project Attendance Overview</h3>
          </div>
          {attendanceOverview && attendanceOverview.overallPercentage !== null && (
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-250 px-2.5 py-1 rounded-xl">
              Turnout: {attendanceOverview.overallPercentage}%
            </span>
          )}
        </div>

        {loadingOverview ? (
          <div className="flex justify-center py-4">
            <Loader2 size={16} className="text-surface-400 animate-spin" />
          </div>
        ) : !attendanceOverview ? (
          <p className="text-xs text-surface-500 italic text-center py-2">No attendance data collected.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Survey Phase Summary */}
            <div className="p-4 bg-surface-50 border border-surface-100 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-surface-900 block">Survey Phase Checks</span>
                <button
                  onClick={() => onNavigateToAttendance('survey')}
                  className="text-[10px] font-bold text-primary-600 hover:text-primary-700 flex items-center gap-0.5 cursor-pointer"
                >
                  History <ArrowRight size={10} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[11px] text-surface-600">
                <div>
                  <span className="text-surface-400 block text-[9px] uppercase tracking-wider">Latest Check-In</span>
                  <span className="font-semibold text-surface-850">{attendanceOverview.surveyCheckIn}</span>
                </div>
                <div>
                  <span className="text-surface-400 block text-[9px] uppercase tracking-wider">Latest Check-Out</span>
                  <span className="font-semibold text-surface-850">{attendanceOverview.surveyCheckOut}</span>
                </div>
              </div>
            </div>

            {/* Camp Phase Summary */}
            <div className="p-4 bg-surface-50 border border-surface-100 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-surface-900 block">Camp Phase Checks</span>
                <button
                  onClick={() => onNavigateToAttendance('camp')}
                  className="text-[10px] font-bold text-primary-600 hover:text-primary-700 flex items-center gap-0.5 cursor-pointer"
                >
                  History <ArrowRight size={10} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[11px] text-surface-600">
                <div>
                  <span className="text-surface-400 block text-[9px] uppercase tracking-wider">Latest Check-In</span>
                  <span className="font-semibold text-surface-850">{attendanceOverview.campCheckIn}</span>
                </div>
                <div>
                  <span className="text-surface-400 block text-[9px] uppercase tracking-wider">Latest Check-Out</span>
                  <span className="font-semibold text-surface-850">{attendanceOverview.campCheckOut}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ── Project Financial Snapshot Card ── */}
      <Card className="p-5 space-y-4 bg-white">
        <div className="flex items-center justify-between border-b border-surface-100 pb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-violet-650" />
            <h3 className="text-sm font-bold text-surface-900">Project Financial Snapshot</h3>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-750 uppercase tracking-wide">
            Read-only Summary
          </span>
        </div>

        {/* Financial Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Survey Budget Card */}
          <div className="p-4 bg-surface-50 border border-surface-100 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-surface-900 border-b border-surface-200 pb-1.5">Survey Phase Budget</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-surface-450">Allocated:</span>
                <span className="font-semibold text-surface-800">{formatCurrency(surveyAllocated)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-450">Spent:</span>
                <span className="font-semibold text-surface-800">{formatCurrency(surveySpent)}</span>
              </div>
              <div className="flex justify-between border-t border-surface-200/50 pt-1.5">
                <span className="text-surface-450">Remaining:</span>
                <span className={`font-bold ${surveyRemaining < 0 ? 'text-red-650' : 'text-emerald-700'}`}>
                  {formatCurrency(surveyRemaining)}
                </span>
              </div>
            </div>
          </div>

          {/* Camp Budget Card */}
          <div className="p-4 bg-surface-50 border border-surface-100 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-surface-900 border-b border-surface-200 pb-1.5">Camp Phase Budget</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-surface-450">Allocated:</span>
                <span className="font-semibold text-surface-800">{formatCurrency(campAllocated)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-450">Spent:</span>
                <span className="font-semibold text-surface-800">{formatCurrency(campSpent)}</span>
              </div>
              <div className="flex justify-between border-t border-surface-200/50 pt-1.5">
                <span className="text-surface-450">Remaining:</span>
                <span className={`font-bold ${campRemaining < 0 ? 'text-red-650' : 'text-emerald-700'}`}>
                  {formatCurrency(campRemaining)}
                </span>
              </div>
            </div>
          </div>

          {/* Overall Budget Card */}
          <div className="p-4 bg-violet-50/40 border border-violet-100 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-violet-900 border-b border-violet-100 pb-1.5">Overall Project Budget</h4>
            <div className="space-y-2 text-xs font-medium">
              <div className="flex justify-between">
                <span className="text-surface-550">Total Allocated:</span>
                <span className="font-bold text-surface-900">{formatCurrency(overallAllocated)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-550">Total Spent:</span>
                <span className="font-bold text-surface-900">{formatCurrency(overallSpent)}</span>
              </div>
              <div className="flex justify-between border-t border-violet-150 pt-1.5">
                <span className="text-surface-550 font-bold">Total Remaining:</span>
                <span className={`font-black ${overallRemaining < 0 ? 'text-red-750' : 'text-emerald-800'}`}>
                  {formatCurrency(overallRemaining)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

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
            value={surveyBudgetLoading || campBudgetLoading ? '…' : formatCurrency(overallSpent)}
            isLoading={false}
            icon={<DollarSign size={18} />}
            color={overallUsedPercent >= 90 ? 'text-red-600' : 'text-violet-700'}
          />
        </div>
      </Card>
    </div>
  );
}
