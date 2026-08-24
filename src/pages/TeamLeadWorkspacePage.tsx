import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useMyProjectAssignment } from '@/features/volunteer/hooks/useMyProjectAssignment';
import { Card, Spinner } from '@/components/ui';
import {
  Camera, ClipboardList, Image as ImageIcon, FileText, DollarSign,
  MapPin, ArrowRight, Calendar, Clock,
} from 'lucide-react';
import { ROUTES, PROJECT_STATUS } from '@/constants';
import { getProjectLifecycleState, PHASE_STATE_LABELS, deriveProjectStatus } from '@/utils/projectLifecycle';
import { supabase } from '@/services/supabase';

export function TeamLeadWorkspacePage() {
  const { displayName, personId } = useAuth();
  const { project, isLoading: projectLoading, error: projectError } = useMyProjectAssignment(personId);

  const [surveyCount, setSurveyCount] = useState<number>(0);
  const [photoCount, setPhotoCount] = useState<number>(0);

  useEffect(() => {
    if (!project?.id) return;
    const fetchCounts = async () => {
      try {
        const [surveyRes, photoRes] = await Promise.all([
          supabase.from('surveys').select('id', { count: 'exact', head: true }).eq('camp_id', project.id),
          supabase.from('photos').select('id', { count: 'exact', head: true }).eq('camp_id', project.id),
        ]);
        if (!surveyRes.error && surveyRes.count !== null) setSurveyCount(surveyRes.count);
        if (!photoRes.error && photoRes.count !== null) setPhotoCount(photoRes.count);
      } catch (err) {
        console.error('Failed to fetch project totals for Team Lead:', err);
      }
    };
    fetchCounts();
  }, [project?.id]);

  if (projectLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  /* ── Derive lifecycle state ── */
  const lifecycle = project ? getProjectLifecycleState(project) : null;
  const lifecycleState = lifecycle?.state ?? null;
  const isArchived = project ? deriveProjectStatus(project) === PROJECT_STATUS.ARCHIVED : false;

  /* ── No access states ──
   * TL access rules:
   *   draft | survey_scheduled → NO ACCESS (before survey)
   *   survey_active           → FULL ACCESS
   *   between_phases          → REVIEW/PREP ACCESS
   *   camp_scheduled          → ACCESS (rare: camp set but no survey)
   *   camp_active             → FULL ACCESS
   *   completed | archived    → NO ACCESS
   */
  const noAccess =
    !lifecycle ||
    !project ||
    isArchived ||
    lifecycleState === 'completed' ||
    (lifecycleState !== 'survey_active' &&
      lifecycleState !== 'between_phases' &&
      lifecycleState !== 'camp_active' &&
      lifecycleState !== 'camp_scheduled');

  /* Informational card content for no-access states */
  const renderNoAccessCard = () => {
    if (!project) {
      return (
        <Card>
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
            <MapPin className="w-8 h-8 text-surface-400" />
            <p className="text-sm font-semibold text-surface-800">No active project assigned</p>
            <p className="text-xs text-surface-500">Contact your faculty coordinator for project assignment.</p>
          </div>
        </Card>
      );
    }

    if (isArchived || lifecycleState === 'completed') {
      return (
        <Card>
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center">
              <Clock className="w-7 h-7 text-surface-400" />
            </div>
            <p className="text-base font-semibold text-surface-800">Project Completed</p>
            <p className="text-sm text-surface-500">{project.camp_name} has concluded.</p>
            <div className="flex flex-col gap-2 w-full max-w-xs mx-auto text-left text-xs bg-surface-50 p-4 rounded-xl border border-surface-200 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-surface-500 font-medium">Survey Forms Submitted:</span>
                <span className="font-bold text-primary-600">{surveyCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-surface-500 font-medium">Documentation Photos Submitted:</span>
                <span className="font-bold text-emerald-600">{photoCount}</span>
              </div>
            </div>
            <p className="text-xs text-surface-400 max-w-sm mt-2">
              All phases have ended. Historical data is available for Faculty review.
            </p>
          </div>
        </Card>
      );
    }

    /* Before survey phase (draft / survey_scheduled) */
    const surveyDate = project.report_settings?.survey_date;
    const surveyStart = project.report_settings?.survey_start_time;
    const surveyDateStr = surveyDate
      ? new Date(`${surveyDate}T${surveyStart || '00:00'}`).toLocaleDateString('en-IN', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        })
      : null;

    return (
      <Card>
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
            <Calendar className="w-7 h-7 text-blue-500" />
          </div>
          <p className="text-base font-semibold text-surface-800">Survey Phase Scheduled</p>
          <p className="text-sm text-surface-500">{project.camp_name}</p>
          {surveyDateStr ? (
            <p className="text-xs text-blue-600 font-semibold">{surveyDateStr}</p>
          ) : (
            <p className="text-xs text-surface-400 italic">Survey schedule not yet set by Faculty.</p>
          )}
          <p className="text-xs text-surface-400 max-w-sm mt-1">
            Your workspace will be accessible once the Survey Phase begins.
          </p>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-surface-900">
            Welcome, {displayName || 'Team Lead'}
          </h1>
          <p className="text-sm text-surface-500 mt-0.5">
            {project ? project.camp_name : 'Team Lead Workspace'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lifecycle && (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              lifecycleState === 'survey_active' ? 'bg-blue-100 text-blue-800' :
              lifecycleState === 'camp_active' ? 'bg-emerald-100 text-emerald-800' :
              lifecycleState === 'between_phases' ? 'bg-amber-100 text-amber-800' :
              lifecycleState === 'completed' ? 'bg-surface-100 text-surface-500' :
              'bg-slate-100 text-slate-600'
            }`}>
              {PHASE_STATE_LABELS[lifecycle.state]}
            </span>
          )}
          <div className="px-3 py-1 rounded-full bg-accent-100 text-accent-800 text-xs font-semibold">
            Team Lead
          </div>
        </div>
      </div>

      {projectError && (
        <Card>
          <p className="text-sm text-red-600 text-center py-4">{projectError}</p>
        </Card>
      )}

      {/* ─── No-access state ─── */}
      {noAccess && renderNoAccessCard()}

      {/* ─── Launchpad Cards — visible when TL has access ─── */}
      {!noAccess && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Volunteer Mode Card */}
          <Link
            to={ROUTES.VOLUNTEER_HOME}
            className="group relative flex items-center justify-between p-6 sm:p-8 bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            <div className="flex items-center gap-5 sm:gap-6">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                <Camera size={28} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  Volunteer Mode
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed max-w-lg">
                  Fill surveys and capture photos exactly like a volunteer.
                </p>
              </div>
            </div>
            <div className="text-slate-400 group-hover:text-purple-600 group-hover:translate-x-1.5 transition-all duration-300 flex-shrink-0 pr-2">
              <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </Link>

          {/* Survey Dashboard Card */}
          <Link
            to={ROUTES.TEAM_LEAD_SURVEYS}
            className="group relative flex items-center justify-between p-6 sm:p-8 bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            <div className="flex items-center gap-5 sm:gap-6">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                <ClipboardList size={28} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  Survey Dashboard
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed max-w-lg">
                  {lifecycleState === 'between_phases'
                    ? 'Review completed survey forms and analytics.'
                    : 'View total, completed, and pending survey forms.'}
                </p>
              </div>
            </div>
            <div className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1.5 transition-all duration-300 flex-shrink-0 pr-2">
              <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </Link>

          {/* Activity Photos Card */}
          {project ? (
            <Link
              to={ROUTES.TEAM_LEAD_PHOTOS}
              className="group relative flex items-center justify-between p-6 sm:p-8 bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              <div className="flex items-center gap-5 sm:gap-6">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                  <ImageIcon size={28} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    Activity Photos
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed max-w-lg">
                    View all volunteer photographs grouped by activity.
                  </p>
                </div>
              </div>
              <div className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1.5 transition-all duration-300 flex-shrink-0 pr-2">
                <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </Link>
          ) : (
            <div className="flex items-center justify-between p-6 sm:p-8 bg-white border border-slate-200 rounded-3xl opacity-50 cursor-not-allowed text-left">
              <div className="flex items-center gap-5 sm:gap-6">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center flex-shrink-0">
                  <ImageIcon size={28} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-bold text-slate-405 leading-tight">
                    Activity Photos
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-lg">
                    View all volunteer photographs grouped by activity.
                  </p>
                </div>
              </div>
              <div className="text-slate-300 flex-shrink-0 pr-2">
                <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
          )}

          {/* Survey Reports Card */}
          <Link
            to={ROUTES.TEAM_LEAD_REPORTS}
            className="group relative flex items-center justify-between p-6 sm:p-8 bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            <div className="flex items-center gap-5 sm:gap-6">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                <FileText size={28} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  Survey Reports
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed max-w-lg">
                  Access individual beneficiary reports and project survey metrics.
                </p>
              </div>
            </div>
            <div className="text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1.5 transition-all duration-300 flex-shrink-0 pr-2">
              <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </Link>

          {/* Budget Card */}
          <Link
            to={ROUTES.TEAM_LEAD_BUDGET}
            className="group relative flex items-center justify-between p-6 sm:p-8 bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-primary-500/20 md:col-span-2"
          >
            <div className="flex items-center gap-5 sm:gap-6">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                <DollarSign size={28} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  Budget
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed max-w-lg">
                  Monitor requested, spent, and remaining project budget allocation.
                </p>
              </div>
            </div>
            <div className="text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1.5 transition-all duration-300 flex-shrink-0 pr-2">
              <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
