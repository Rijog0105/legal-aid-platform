import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  CheckCircle2,
  Activity,
  FolderKanban,
  ArrowRight,
  Plus,
  Sparkles,
} from 'lucide-react';
import { ROUTES } from '@/constants';
import { Spinner } from '@/components/ui';
import { fetchProjects } from '@/features/projects/services/projectService';
import { fetchPeople } from '@/features/people/services/peopleService';
import { getProjectLifecycleState } from '@/utils/projectLifecycle';

/**
 * Compact Single-Page Control Center Dashboard (No Scrolling Required on Standard Displays)
 * Houses the 3 core platform modules (Projects, People Registry, Survey Analytics) and quick metrics.
 */
export function DashboardPage() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    totalProjects: 0,
    registeredPeople: 0,
    activeProjects: 0,
    completedProjects: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const [projects, people] = await Promise.all([
          fetchProjects(),
          fetchPeople({ includePending: true }),
        ]);

        const activeCount = projects.filter((project) => {
          const lc = getProjectLifecycleState(project);
          return (
            lc.state === 'survey_active' ||
            lc.state === 'between_phases' ||
            lc.state === 'camp_active' ||
            lc.state === 'camp_scheduled' ||
            lc.state === 'survey_scheduled'
          );
        }).length;

        const completedCount = projects.filter((project) => {
          const lc = getProjectLifecycleState(project);
          return lc.state === 'completed';
        }).length;

        setMetrics({
          totalProjects: projects.length,
          registeredPeople: people.length,
          activeProjects: activeCount,
          completedProjects: completedCount,
        });
      } catch (err) {
        console.error('Error fetching dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMetrics();
  }, []);

  return (
    <div className="flex flex-col gap-4 w-full mx-auto animate-fade-in">
      {/* ─── Compact Top Hero Header ─── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-4 sm:p-5 shadow-lg shadow-slate-900/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[10px] font-bold text-indigo-200">
            <Sparkles size={11} className="text-amber-400" />
            <span>Faculty & Administrative Command Center</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
            Legal Aid Clinic Platform
          </h1>
          <p className="text-[11px] text-slate-300">
            Institutional management for legal awareness drives, household surveys, roll calls, and automated report preparation.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigate(ROUTES.PROJECT_CREATE)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white font-bold text-xs shadow-md shadow-indigo-500/25 transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>New Legal Aid Project</span>
          </button>
        </div>
      </div>

      {/* ─── Compact 4-Metric Grid ─── */}
      {loading ? (
        <div className="flex justify-center py-6">
          <Spinner size="md" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Total Projects
              </span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <FolderKanban size={15} />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-1">{metrics.totalProjects}</p>
            <span className="text-[10px] font-semibold text-slate-400">Configured Legal Camps</span>
          </div>

          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                People Directory
              </span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users size={15} />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-1">{metrics.registeredPeople}</p>
            <span className="text-[10px] font-semibold text-slate-400">Students & Faculty</span>
          </div>

          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Active Operations
              </span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Activity size={15} />
              </div>
            </div>
            <p className="text-2xl font-black text-amber-600 mt-1">{metrics.activeProjects}</p>
            <span className="text-[10px] font-semibold text-slate-400">Fieldwork In Progress</span>
          </div>

          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Completed
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 size={15} />
              </div>
            </div>
            <p className="text-2xl font-black text-emerald-600 mt-1">{metrics.completedProjects}</p>
            <span className="text-[10px] font-semibold text-slate-400">Archived Reports</span>
          </div>
        </div>
      )}

      {/* ─── 2 Primary Modules in One Compact View (Projects, People) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Module 1: Legal Aid Projects */}
        <div
          onClick={() => navigate(ROUTES.PROJECTS)}
          className="group bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="space-y-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FolderKanban size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                Legal Aid Projects
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Configure Survey & Camp phases, track GPS attendance sessions, assign student volunteers, and manage budgets.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3.5 mt-3.5 border-t border-slate-100 text-xs font-bold text-indigo-600">
            <span>Manage All Projects</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Module 2: People Directory */}
        <div
          onClick={() => navigate(ROUTES.PEOPLE)}
          className="group bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="space-y-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                People Directory & Approvals
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Approve or reject student registrations, manage faculty coordinators, and maintain external guest records.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3.5 mt-3.5 border-t border-slate-100 text-xs font-bold text-emerald-600">
            <span>Open Directory & Approvals</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
}
