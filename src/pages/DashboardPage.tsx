import { useNavigate } from 'react-router-dom';
import { Tent, FileText, Scale } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ROUTES } from '@/constants';

export function DashboardPage() {
  const { displayName } = useAuth();
  const navigate = useNavigate();

  return (
    <div>
      {/* ─── Header ─── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900">
          Welcome, {displayName || 'User'}
        </h1>
        <p className="text-surface-500 mt-1">
          Here's an overview of your legal aid camp activities
        </p>
      </div>

      {/* ─── Quick Actions ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Camp Card */}
        <div
          className="group relative overflow-hidden bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-6 text-white cursor-pointer shadow-lg shadow-primary-600/20 hover:shadow-xl hover:shadow-primary-600/30 transition-all duration-300 hover:-translate-y-1"
          onClick={() => navigate(ROUTES.CAMPS)}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-4">
              <Tent className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Camp Management</h3>
            <p className="text-primary-200 text-sm">Create and manage legal aid camps</p>
          </div>
        </div>

        {/* People Card */}
        <div
          className="group relative overflow-hidden bg-gradient-to-br from-accent-600 to-accent-800 rounded-2xl p-6 text-white cursor-pointer shadow-lg shadow-accent-600/20 hover:shadow-xl hover:shadow-accent-600/30 transition-all duration-300 hover:-translate-y-1"
          onClick={() => navigate(ROUTES.PEOPLE)}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-4">
              <Scale className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold mb-1">People Registry</h3>
            <p className="text-emerald-200 text-sm">Manage faculty, students & guests</p>
          </div>
        </div>

        {/* Reports Card */}
        <div
          className="group relative overflow-hidden bg-gradient-to-br from-amber-600 to-orange-700 rounded-2xl p-6 text-white cursor-pointer shadow-lg shadow-amber-600/20 hover:shadow-xl hover:shadow-amber-600/30 transition-all duration-300 hover:-translate-y-1"
          onClick={() => navigate(ROUTES.CAMPS)}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-4">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Reports</h3>
            <p className="text-amber-200 text-sm">Generate institutional camp reports</p>
          </div>
        </div>
      </div>

      {/* ─── Placeholder Stats ─── */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Camps', value: '—', color: 'text-primary-600' },
          { label: 'Active Camps', value: '—', color: 'text-emerald-600' },
          { label: 'Volunteers', value: '—', color: 'text-blue-600' },
          { label: 'Reports Generated', value: '—', color: 'text-amber-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-surface-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
