import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale, Users, CheckCircle2, Activity, Layers, ArrowRight } from 'lucide-react';
import { ROUTES } from '@/constants';
import { Spinner } from '@/components/ui';
import { fetchProjects } from '@/features/projects/services/projectService';
import { fetchPeople } from '@/features/people/services/peopleService';
import { getProjectLifecycleState } from '@/utils/projectLifecycle';

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
    <div className="flex flex-col gap-8 md:gap-10 w-full py-2 animate-fade-in">
      {/* ─── Page Title Header ─── */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm flex-shrink-0">
          <Scale size={26} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">Faculty Control Center</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-2.5 leading-normal">
            Central management for legal aid projects, student delegations, and institutional registries.
          </p>
        </div>
      </div>

      {/* ─── Primary Cards Grid ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {/* Card 1: Projects */}
        <button
          onClick={() => navigate(ROUTES.PROJECTS)}
          className="group relative overflow-hidden bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8] rounded-3xl p-8 sm:p-10 text-white cursor-pointer shadow-lg shadow-blue-500/10 hover:shadow-2xl hover:shadow-blue-500/35 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[280px] text-left w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
        >
          {/* Classical Temple SVG Illustration */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 160 140"
            className="absolute right-0 bottom-0 w-44 h-44 text-white opacity-[0.15] pointer-events-none select-none transition-transform duration-500 group-hover:scale-105 group-hover:translate-x-1"
            fill="currentColor"
          >
            {/* Pediment (Triangle roof) */}
            <path d="M10 40 L80 15 L150 40 Z" />
            {/* Architrave */}
            <rect x="15" y="40" width="130" height="8" rx="2" />
            <rect x="20" y="48" width="120" height="4" />
            {/* Pillars */}
            <rect x="28" y="52" width="10" height="60" rx="1" />
            <rect x="52" y="52" width="10" height="60" rx="1" />
            <rect x="76" y="52" width="10" height="60" rx="1" />
            <rect x="100" y="52" width="10" height="60" rx="1" />
            <rect x="122" y="52" width="10" height="60" rx="1" />
            {/* Base Steps */}
            <rect x="10" y="112" width="140" height="6" rx="1" />
            <rect x="5" y="118" width="150" height="8" rx="2" />
          </svg>

          <div>
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-6 ring-1 ring-white/15">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">Legal Aid Projects</h2>
            <p className="text-blue-50 text-xs sm:text-sm leading-relaxed max-w-xs mt-2.5 font-medium">
              Create, schedule, assign delegations, and monitor project documentation & reporting.
            </p>
          </div>

          <div className="pt-6">
            <span className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-white text-blue-700 font-bold text-xs hover:bg-blue-50 active:scale-95 transition-all shadow-sm">
              Open Project Registry <ArrowRight size={14} className="ml-1.5 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>
        </button>

        {/* Card 2: People Registry */}
        <button
          onClick={() => navigate(ROUTES.PEOPLE)}
          className="group relative overflow-hidden bg-gradient-to-br from-[#10b981] to-[#047857] rounded-3xl p-8 sm:p-10 text-white cursor-pointer shadow-lg shadow-emerald-500/10 hover:shadow-2xl hover:shadow-emerald-500/35 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[280px] text-left w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500"
        >
          {/* People/Group SVG Illustration */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 160 140"
            className="absolute right-0 bottom-0 w-44 h-44 text-white opacity-[0.15] pointer-events-none select-none transition-transform duration-500 group-hover:scale-105 group-hover:translate-x-1"
            fill="currentColor"
          >
            {/* Left person */}
            <circle cx="50" cy="55" r="18" />
            <path d="M20 100 A22 22 0 0 1 80 100 Z" />
            {/* Center / Front person */}
            <circle cx="95" cy="45" r="22" />
            <path d="M60 95 A28 28 0 0 1 130 95 Z" />
            {/* Right person */}
            <circle cx="130" cy="65" r="14" />
            <path d="M105 105 A18 18 0 0 1 155 105 Z" />
          </svg>

          <div>
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-6 ring-1 ring-white/15">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">People Registry</h2>
            <p className="text-emerald-50 text-xs sm:text-sm leading-relaxed max-w-xs mt-2.5 font-medium">
              Manage institutional directory of Faculty, Student Volunteers, Team Leads, and Guests.
            </p>
          </div>

          <div className="pt-6">
            <span className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-white text-emerald-700 font-bold text-xs hover:bg-emerald-50 active:scale-95 transition-all shadow-sm">
              Manage Directory <ArrowRight size={14} className="ml-1.5 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>
        </button>
      </div>

      {/* ─── System Overview Section ─── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm mt-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-650 flex items-center justify-center flex-shrink-0">
            <Activity size={20} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight leading-none">System Overview</h2>
            <p className="text-xs text-slate-500 mt-2 leading-none">
              Real-time overview of your legal aid management system.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="md" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 mt-8">
            {/* Metric 1: Total Projects */}
            <div className="bg-white rounded-2xl p-5 border border-slate-150 flex items-center gap-4 hover:bg-slate-50/50 hover:border-slate-200 transition-all shadow-xs border-b-4 border-b-violet-500">
              <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center flex-shrink-0">
                <Layers size={22} />
              </div>
              <div>
                <p className="text-2xl font-black text-violet-600 leading-none">{metrics.totalProjects}</p>
                <p className="text-xs font-bold text-slate-800 uppercase tracking-tight mt-2.5 leading-none">Total Projects</p>
                <p className="text-[10px] text-slate-400 mt-1.5 leading-none font-medium">All time projects</p>
              </div>
            </div>

            {/* Metric 2: Registered People */}
            <div className="bg-white rounded-2xl p-5 border border-slate-150 flex items-center gap-4 hover:bg-slate-50/50 hover:border-slate-200 transition-all shadow-xs border-b-4 border-b-emerald-500">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <Users size={22} />
              </div>
              <div>
                <p className="text-2xl font-black text-emerald-600 leading-none">{metrics.registeredPeople}</p>
                <p className="text-xs font-bold text-slate-800 uppercase tracking-tight mt-2.5 leading-none">Registered People</p>
                <p className="text-[10px] text-slate-400 mt-1.5 leading-none font-medium">Faculty, volunteers & guests</p>
              </div>
            </div>

            {/* Metric 3: Active Projects */}
            <div className="bg-white rounded-2xl p-5 border border-slate-150 flex items-center gap-4 hover:bg-slate-50/50 hover:border-slate-200 transition-all shadow-xs border-b-4 border-b-blue-500">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <Activity size={22} />
              </div>
              <div>
                <p className="text-2xl font-black text-blue-600 leading-none">{metrics.activeProjects}</p>
                <p className="text-xs font-bold text-slate-800 uppercase tracking-tight mt-2.5 leading-none">Active Projects</p>
                <p className="text-[10px] text-slate-400 mt-1.5 leading-none font-medium">Currently running</p>
              </div>
            </div>

            {/* Metric 4: Completed Projects */}
            <div className="bg-white rounded-2xl p-5 border border-slate-150 flex items-center gap-4 hover:bg-slate-50/50 hover:border-slate-200 transition-all shadow-xs border-b-4 border-b-orange-500">
              <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <p className="text-2xl font-black text-orange-600 leading-none">{metrics.completedProjects}</p>
                <p className="text-xs font-bold text-slate-800 uppercase tracking-tight mt-2.5 leading-none">Completed Projects</p>
                <p className="text-[10px] text-slate-400 mt-1.5 leading-none font-medium">Successfully completed</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
