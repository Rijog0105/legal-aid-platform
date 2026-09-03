import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useMyProjectAssignment } from '@/features/volunteer/hooks/useMyProjectAssignment';
import { Spinner } from '@/components/ui';
import {
  Camera,
  ClipboardList,
  MapPin,
  ArrowRight,
  Clock,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { ROUTES, PROJECT_STATUS } from '@/constants';
import { getProjectLifecycleState, deriveProjectStatus } from '@/utils/projectLifecycle';
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
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-10 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <MapPin size={26} />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Active Project Assigned</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You are not currently assigned as Team Lead for an active legal aid camp project. Please contact your Faculty Coordinator.
          </p>
        </div>
      );
    }

    if (isArchived || lifecycleState === 'completed') {
      return (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 size={28} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Project Concluded</h3>
            <p className="text-xs text-slate-500">{project.camp_name} has completed all field phases.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto text-left">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Surveys Submitted</span>
              <p className="text-xl font-black text-indigo-600 mt-0.5">{surveyCount}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Photos Captured</span>
              <p className="text-xl font-black text-emerald-600 mt-0.5">{photoCount}</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <Clock size={28} />
        </div>
        <h3 className="text-base font-bold text-slate-900">Project Scheduled</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Team Lead workspace tools activate automatically once the survey or camp phase begins.
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in pb-12">
      {/* ─── Hero Header ─── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-[11px] font-bold text-indigo-700">
              <ShieldCheck size={13} />
              <span>Team Lead Command Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Welcome back, {displayName || 'Team Lead'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Manage on-ground field data collection, photo documentation, and team coordination.
            </p>
          </div>

          {project && (
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0">
                <MapPin size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Camp</span>
                <p className="text-xs font-bold text-slate-900 truncate">{project.camp_name}</p>
                <p className="text-[11px] text-slate-500 truncate">{project.village_name}, {project.district}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {projectError && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs">
          {projectError}
        </div>
      )}

      {noAccess ? (
        renderNoAccessCard()
      ) : (
        <div className="space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Survey Submissions</span>
              <p className="text-2xl font-black text-indigo-600 mt-1">{surveyCount}</p>
              <span className="text-[11px] font-semibold text-slate-500">Household responses recorded</span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Activity Photos</span>
              <p className="text-2xl font-black text-emerald-600 mt-1">{photoCount}</p>
              <span className="text-[11px] font-semibold text-slate-500">Documented by team</span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phase Status</span>
              <p className="text-base font-bold text-slate-900 mt-2 capitalize">{lifecycleState?.replace('_', ' ')}</p>
              <span className="text-[11px] font-semibold text-slate-500">Operational state</span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Village</span>
              <p className="text-base font-bold text-slate-900 mt-2 truncate">{project?.village_name}</p>
              <span className="text-[11px] font-semibold text-slate-500">{project?.taluk}</span>
            </div>
          </div>

          {/* Action Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Direct Volunteer Mode / Survey Action */}
            <Link
              to={ROUTES.VOLUNTEER_HOME}
              className="group bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-md hover:shadow-xl hover:scale-[1.01] transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 text-amber-300 flex items-center justify-center group-hover:scale-105 transition-transform backdrop-blur-md">
                  <ClipboardList size={24} />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-300 mb-1">
                    Fieldwork Action
                  </div>
                  <h3 className="text-base font-bold text-white">
                    Conduct Survey / Field Mode
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Transform to Volunteer Field Mode to conduct door-to-door household surveys and submit records directly.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 pt-4 mt-4 border-t border-white/10">
                <span>Enter Volunteer Field View</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Photos & Activity Documentation */}
            <Link
              to={ROUTES.TEAM_LEAD_PHOTOS}
              className="group bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Camera size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    Activity Photos & Documentation
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Review, approve, and organize high-resolution activity photos uploaded by student volunteers.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 pt-4 mt-4 border-t border-slate-100">
                <span>Open Documentation Portal</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Surveys & Reports */}
            <Link
              to={ROUTES.TEAM_LEAD_SURVEYS}
              className="group bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <ClipboardList size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                    Household Survey Dashboard
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Monitor survey intake progress, view vulnerable household flags, and audit field submissions.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 pt-4 mt-4 border-t border-slate-100">
                <span>View Survey Submissions</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
