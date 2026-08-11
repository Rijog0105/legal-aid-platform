import { useNavigate } from 'react-router-dom';
import { Tent, Users } from 'lucide-react';
import { ROUTES } from '@/constants';

/**
 * Faculty Control Center (Level 1 Workspace)
 * Contains strictly 2 primary cards (Camps and People Registry)
 */
export function DashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ─── Page Title ─── */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Faculty Control Center</h1>
        <p className="text-sm text-surface-500 mt-1">
          Central management for legal aid projects, student delegations, and institutional registries.
        </p>
      </div>

      {/* ─── Primary Cards Grid ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Projects */}
        <div
          onClick={() => navigate(ROUTES.PROJECTS)}
          className="group relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 rounded-3xl p-6 text-white cursor-pointer shadow-lg shadow-primary-700/20 hover:shadow-xl hover:shadow-primary-700/30 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between min-h-[220px]"
        >
          <div className="absolute top-0 right-0 w-36 h-36 bg-white/5 rounded-full -translate-y-10 translate-x-10 group-hover:scale-110 transition-transform" />
          
          <div>
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-4">
              <Tent className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold mb-1">Legal Aid Projects</h2>
            <p className="text-primary-100 text-xs leading-relaxed">
              Create, schedule, assign delegations, and monitor project documentation & reporting.
            </p>
          </div>

          <div className="pt-4 flex items-center justify-between text-xs font-semibold text-primary-200 group-hover:text-white transition-colors">
            <span>Open Project Registry →</span>
          </div>
        </div>

        {/* Card 2: People Registry */}
        <div
          onClick={() => navigate(ROUTES.PEOPLE)}
          className="group relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-900 rounded-3xl p-6 text-white cursor-pointer shadow-lg shadow-emerald-700/20 hover:shadow-xl hover:shadow-emerald-700/30 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between min-h-[220px]"
        >
          <div className="absolute top-0 right-0 w-36 h-36 bg-white/5 rounded-full -translate-y-10 translate-x-10 group-hover:scale-110 transition-transform" />
          
          <div>
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold mb-1">People Registry</h2>
            <p className="text-emerald-100 text-xs leading-relaxed">
              Manage institutional directory of Faculty, Student Volunteers, Team Leads, and Guests.
            </p>
          </div>

          <div className="pt-4 flex items-center justify-between text-xs font-semibold text-emerald-200 group-hover:text-white transition-colors">
            <span>Manage Directory →</span>
          </div>
        </div>
      </div>
    </div>
  );
}
