import { useState, useEffect } from 'react';
import {
  Users,
  DollarSign,
  CheckCircle,
  GraduationCap,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { ProjectStatusBadge } from '@/components/ui';
import type { Project } from '@/types';
import { PROJECT_ROLE } from '@/constants';
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

export function ProjectOverviewCard({
  project,
  onNavigateToSurveySchedule,
  onNavigateToCampSchedule,
  onNavigateToAttendance,
}: ProjectOverviewCardProps) {
  const [attendanceOverview, setAttendanceOverview] = useState<{
    surveyCheckIn: string;
    surveyCheckOut: string;
    campCheckIn: string;
    campCheckOut: string;
    surveyPercentage: number | null;
    campPercentage: number | null;
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
    project.id, 'survey', project.allocated_budget_survey
  );
  const { totalSpent: campSpent, isLoading: campBudgetLoading } = useExpenses(
    project.id, 'camp', project.allocated_budget_camp
  );

  const volunteerCount  = projectPeople.filter((p) => p.camp_role === PROJECT_ROLE.VOLUNTEER).length;
  const teamLeadCount   = projectPeople.filter((p) => p.camp_role === PROJECT_ROLE.TEAM_LEAD).length;
  const facultyCount    = projectPeople.filter((p) => p.camp_role === PROJECT_ROLE.FACULTY_COORDINATOR).length;
  const totalAssigned   = projectPeople.length;
  const completedActivities = activities.filter((a) => a.status === 'completed').length;

  const surveyAllocated = project.allocated_budget_survey ?? 0;
  const surveyRemaining = surveyAllocated - surveySpent;
  const campAllocated   = project.allocated_budget_camp ?? 0;
  const campRemaining   = campAllocated - campSpent;
  const overallAllocated = surveyAllocated + campAllocated;
  const overallSpent     = surveySpent + campSpent;
  const overallRemaining = overallAllocated - overallSpent;

  return (
    <div className="space-y-6 pb-6">

      {/* ── Row 1: Project Summary ── */}
      <div className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5 transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-px">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-extrabold text-surface-900 tracking-tight">Project Summary</h2>
            <ProjectStatusBadge status={project.status} />
          </div>
          <p className="text-xs text-surface-500 leading-relaxed font-medium line-clamp-2 max-w-4xl">
            {project.description || 'No description provided for this legal aid camp project. Operational details, assignments, and budgets are monitored below.'}
          </p>
        </div>
        <div className="flex-shrink-0 grid grid-cols-3 sm:grid-cols-5 gap-3 border-t lg:border-t-0 lg:border-l border-surface-200 pt-3 lg:pt-0 lg:pl-5">
          <div>
            <span className="block font-bold text-surface-400 uppercase tracking-wider" style={{ fontSize: '9px' }}>Village</span>
            <span className="block font-extrabold text-surface-800 truncate text-xs" title={project.village_name}>{project.village_name}</span>
          </div>
          <div>
            <span className="block font-bold text-surface-400 uppercase tracking-wider" style={{ fontSize: '9px' }}>Taluk</span>
            <span className="block font-extrabold text-surface-800 truncate text-xs" title={project.taluk}>{project.taluk}</span>
          </div>
          <div>
            <span className="block font-bold text-surface-400 uppercase tracking-wider" style={{ fontSize: '9px' }}>District</span>
            <span className="block font-extrabold text-surface-800 truncate text-xs" title={project.district}>{project.district}</span>
          </div>
          <div>
            <span className="block font-bold text-surface-400 uppercase tracking-wider" style={{ fontSize: '9px' }}>State</span>
            <span className="block font-extrabold text-surface-800 truncate text-xs">{project.report_settings?.state ?? 'Karnataka'}</span>
          </div>
          {project.report_settings?.academic_year && (
            <div>
              <span className="block font-bold text-surface-400 uppercase tracking-wider" style={{ fontSize: '9px' }}>Year</span>
              <span className="block font-extrabold text-surface-800 truncate text-xs">{project.report_settings.academic_year}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 2: Three columns ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Col 1 — Schedule cards stacked */}
        <div className="lg:col-span-4 flex flex-col justify-between h-[308px]">
          <div className="h-[146px] transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-px rounded-2xl">
            <SurveyScheduleCard project={project} onNavigateToSchedule={onNavigateToSurveySchedule} />
          </div>
          <div className="h-[146px] transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-px rounded-2xl">
            <CampScheduleCard project={project} onNavigateToSchedule={onNavigateToCampSchedule} />
          </div>
        </div>

        {/* Col 2 — Attendance Summary */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-surface-200 shadow-sm flex flex-col h-[308px] p-5 transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-px">
          <div className="flex items-center justify-between border-b border-surface-100 pb-2 mb-2">
            <div>
              <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider">Attendance Summary</h3>
              <p className="text-xs text-surface-400 font-medium mt-0.5">Live check-in &amp; turnout metrics</p>
            </div>
          </div>

          {loadingOverview ? (
            <div className="flex justify-center items-center flex-1 py-8">
              <Loader2 size={16} className="text-surface-400 animate-spin" />
            </div>
          ) : !attendanceOverview ? (
            <div className="text-center text-surface-400 italic text-xs flex-1 flex items-center justify-center py-8">
              No attendance history has been recorded yet.
            </div>
          ) : (
            <div className="flex flex-col justify-between flex-grow pt-1.5 pb-0.5">
              {/* Survey Phase */}
              <div className="bg-surface-50 rounded-xl border border-surface-200 p-3 flex flex-col justify-between h-[105px] shadow-sm">
                <div className="flex items-center justify-between border-b border-surface-100 pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-surface-800 uppercase tracking-wider">Survey Phase</span>
                    {attendanceOverview.surveyPercentage !== null ? (
                      <span className="text-xs font-extrabold text-primary-700 bg-primary-50 border border-primary-100 rounded-full px-2 py-0.5" style={{ fontSize: '9px' }}>
                        {attendanceOverview.surveyPercentage}% Turnout
                      </span>
                    ) : (
                      <span className="font-bold text-surface-400 bg-surface-100 border border-surface-200 rounded-full px-2 py-0.5" style={{ fontSize: '8px' }}>
                        No Sessions
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => onNavigateToAttendance('survey')}
                    className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-0.5 cursor-pointer transition-colors duration-150"
                  >
                    <span>Log</span><ArrowRight size={10} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 flex-grow pt-2">
                  <div className="bg-white p-2 rounded-lg border border-surface-100 text-center flex flex-col justify-center">
                    <span className="block font-bold text-surface-400 uppercase tracking-wider mb-0.5" style={{ fontSize: '8px' }}>Check-In</span>
                    <span className="block font-extrabold text-surface-800 truncate text-xs">{attendanceOverview.surveyCheckIn}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-surface-100 text-center flex flex-col justify-center">
                    <span className="block font-bold text-surface-400 uppercase tracking-wider mb-0.5" style={{ fontSize: '8px' }}>Check-Out</span>
                    <span className="block font-extrabold text-surface-800 truncate text-xs">{attendanceOverview.surveyCheckOut}</span>
                  </div>
                </div>
              </div>

              {/* Camp Phase */}
              <div className="bg-surface-50 rounded-xl border border-surface-200 p-3 flex flex-col justify-between h-[105px] shadow-sm">
                <div className="flex items-center justify-between border-b border-surface-100 pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-surface-800 uppercase tracking-wider">Camp Phase</span>
                    {attendanceOverview.campPercentage !== null ? (
                      <span className="text-xs font-extrabold text-accent-600 bg-accent-50 border border-accent-100 rounded-full px-2 py-0.5" style={{ fontSize: '9px' }}>
                        {attendanceOverview.campPercentage}% Turnout
                      </span>
                    ) : (
                      <span className="font-bold text-surface-400 bg-surface-100 border border-surface-200 rounded-full px-2 py-0.5" style={{ fontSize: '8px' }}>
                        No Sessions
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => onNavigateToAttendance('camp')}
                    className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-0.5 cursor-pointer transition-colors duration-150"
                  >
                    <span>Log</span><ArrowRight size={10} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 flex-grow pt-2">
                  <div className="bg-white p-2 rounded-lg border border-surface-100 text-center flex flex-col justify-center">
                    <span className="block font-bold text-surface-400 uppercase tracking-wider mb-0.5" style={{ fontSize: '8px' }}>Check-In</span>
                    <span className="block font-extrabold text-surface-800 truncate text-xs">{attendanceOverview.campCheckIn}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-surface-100 text-center flex flex-col justify-center">
                    <span className="block font-bold text-surface-400 uppercase tracking-wider mb-0.5" style={{ fontSize: '8px' }}>Check-Out</span>
                    <span className="block font-extrabold text-surface-800 truncate text-xs">{attendanceOverview.campCheckOut}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Col 3 — Financial Snapshot */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-surface-200 shadow-sm flex flex-col h-[308px] p-5 transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-px">
          <div className="flex items-center justify-between border-b border-surface-100 pb-2 mb-2">
            <div>
              <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider">Financial Snapshot</h3>
              <p className="text-xs text-surface-400 font-medium mt-0.5">Budget usage &amp; remaining allocation</p>
            </div>
          </div>

          <div className="flex flex-col justify-between flex-grow pt-1.5 pb-0.5">
            {/* Survey budget */}
            <div className="p-3 bg-surface-50 border border-surface-200 rounded-xl h-[68px] flex flex-col justify-center shadow-sm">
              <p className="text-[10px] font-bold text-surface-700 border-b border-surface-200 pb-0.5 mb-1.5 uppercase tracking-wider">Survey Phase Budget</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="block font-bold text-surface-400 uppercase tracking-wider mb-0.5" style={{ fontSize: '8px' }}>Allocated</span>
                  <span className="block font-extrabold text-surface-800 text-xs">{formatCurrency(surveyAllocated)}</span>
                </div>
                <div>
                  <span className="block font-bold text-surface-400 uppercase tracking-wider mb-0.5" style={{ fontSize: '8px' }}>Spent</span>
                  <span className="block font-extrabold text-surface-800 text-xs">{surveyBudgetLoading ? '...' : formatCurrency(surveySpent)}</span>
                </div>
                <div>
                  <span className="block font-bold text-surface-400 uppercase tracking-wider mb-0.5" style={{ fontSize: '8px' }}>Remaining</span>
                  <span className={`block font-extrabold text-xs ${surveyRemaining < 0 ? 'text-red-600' : 'text-success'}`}>
                    {surveyBudgetLoading ? '...' : formatCurrency(surveyRemaining)}
                  </span>
                </div>
              </div>
            </div>

            {/* Camp budget */}
            <div className="p-3 bg-surface-50 border border-surface-200 rounded-xl h-[68px] flex flex-col justify-center shadow-sm">
              <p className="text-[10px] font-bold text-surface-700 border-b border-surface-200 pb-0.5 mb-1.5 uppercase tracking-wider">Camp Phase Budget</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="block font-bold text-surface-400 uppercase tracking-wider mb-0.5" style={{ fontSize: '8px' }}>Allocated</span>
                  <span className="block font-extrabold text-surface-800 text-xs">{formatCurrency(campAllocated)}</span>
                </div>
                <div>
                  <span className="block font-bold text-surface-400 uppercase tracking-wider mb-0.5" style={{ fontSize: '8px' }}>Spent</span>
                  <span className="block font-extrabold text-surface-800 text-xs">{campBudgetLoading ? '...' : formatCurrency(campSpent)}</span>
                </div>
                <div>
                  <span className="block font-bold text-surface-400 uppercase tracking-wider mb-0.5" style={{ fontSize: '8px' }}>Remaining</span>
                  <span className={`block font-extrabold text-xs ${campRemaining < 0 ? 'text-red-600' : 'text-success'}`}>
                    {campBudgetLoading ? '...' : formatCurrency(campRemaining)}
                  </span>
                </div>
              </div>
            </div>

            {/* Overall budget — dark surface */}
            <div className="p-3 bg-surface-900 border border-surface-800 rounded-xl h-[68px] flex flex-col justify-center shadow-md">
              <p className="text-[10px] font-bold text-surface-200 border-b border-surface-800 pb-0.5 mb-1.5 uppercase tracking-wider">Overall Project Budget</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="block font-bold text-surface-500 uppercase tracking-wider mb-0.5" style={{ fontSize: '8px' }}>Allocated</span>
                  <span className="block font-extrabold text-white text-xs">{formatCurrency(overallAllocated)}</span>
                </div>
                <div>
                  <span className="block font-bold text-surface-500 uppercase tracking-wider mb-0.5" style={{ fontSize: '8px' }}>Spent</span>
                  <span className="block font-extrabold text-white text-xs">{surveyBudgetLoading || campBudgetLoading ? '...' : formatCurrency(overallSpent)}</span>
                </div>
                <div>
                  <span className="block font-bold text-surface-500 uppercase tracking-wider mb-0.5" style={{ fontSize: '8px' }}>Remaining</span>
                  <span className={`block font-extrabold text-xs ${overallRemaining < 0 ? 'text-red-400' : 'text-accent-400'}`}>
                    {surveyBudgetLoading || campBudgetLoading ? '...' : formatCurrency(overallRemaining)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── Row 3: Quick Statistics ── */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">

        <div className="bg-white rounded-2xl border border-surface-200 shadow-sm p-4 flex flex-col items-center justify-between text-center h-24 transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-px">
          <div className="flex items-center gap-1.5 text-surface-400">
            <Users size={12} />
            <span className="font-bold uppercase tracking-wider text-surface-400" style={{ fontSize: '9px' }}>Volunteers</span>
          </div>
          <div className="flex items-center justify-center flex-1 mt-1">
            {peopleLoading ? <Loader2 size={14} className="animate-spin text-surface-300" /> :
              <span className="text-3xl font-black text-surface-900 leading-none">{volunteerCount}</span>}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-surface-200 shadow-sm p-4 flex flex-col items-center justify-between text-center h-24 transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-px">
          <div className="flex items-center gap-1.5 text-primary-400">
            <GraduationCap size={12} />
            <span className="font-bold uppercase tracking-wider text-primary-400" style={{ fontSize: '9px' }}>Team Leads</span>
          </div>
          <div className="flex items-center justify-center flex-1 mt-1">
            {peopleLoading ? <Loader2 size={14} className="animate-spin text-surface-300" /> :
              <span className="text-3xl font-black text-primary-600 leading-none">{teamLeadCount}</span>}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-surface-200 shadow-sm p-4 flex flex-col items-center justify-between text-center h-24 transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-px">
          <div className="flex items-center gap-1.5 text-surface-500">
            <Users size={12} />
            <span className="font-bold uppercase tracking-wider text-surface-400" style={{ fontSize: '9px' }}>Faculty</span>
          </div>
          <div className="flex items-center justify-center flex-1 mt-1">
            {peopleLoading ? <Loader2 size={14} className="animate-spin text-surface-300" /> :
              <span className="text-3xl font-black text-surface-900 leading-none">{facultyCount}</span>}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-surface-200 shadow-sm p-4 flex flex-col items-center justify-between text-center h-24 transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-px">
          <div className="flex items-center gap-1.5 text-surface-400">
            <Users size={12} />
            <span className="font-bold uppercase tracking-wider text-surface-400" style={{ fontSize: '9px' }}>Assigned</span>
          </div>
          <div className="flex items-center justify-center flex-1 mt-1">
            {peopleLoading ? <Loader2 size={14} className="animate-spin text-surface-300" /> :
              <span className="text-3xl font-black text-surface-900 leading-none">{totalAssigned}</span>}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-surface-200 shadow-sm p-4 flex flex-col items-center justify-between text-center h-24 transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-px">
          <div className="flex items-center gap-1.5 text-accent-500">
            <CheckCircle size={12} />
            <span className="font-bold uppercase tracking-wider text-accent-500" style={{ fontSize: '9px' }}>Activities</span>
          </div>
          <div className="flex items-center justify-center flex-1 mt-1">
            {activitiesLoading ? <Loader2 size={14} className="animate-spin text-surface-300" /> :
              <span className="text-3xl font-black text-accent-600 leading-none">{completedActivities}/{activities.length}</span>}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-surface-200 shadow-sm p-4 flex flex-col items-center justify-between text-center h-24 transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-px">
          <div className="flex items-center gap-1.5 text-primary-400">
            <DollarSign size={12} />
            <span className="font-bold uppercase tracking-wider text-primary-400" style={{ fontSize: '9px' }}>Budget Spent</span>
          </div>
          <div className="flex items-center justify-center flex-1 mt-1">
            {surveyBudgetLoading || campBudgetLoading ? <Loader2 size={14} className="animate-spin text-surface-300" /> :
              <span className="text-sm font-black text-surface-900 leading-none block truncate max-w-24" title={formatCurrency(overallSpent)}>
                {formatCurrency(overallSpent)}
              </span>}
          </div>
        </div>

      </div>
    </div>
  );
}
