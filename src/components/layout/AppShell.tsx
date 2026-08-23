import { useNavigate, Outlet } from 'react-router-dom';
import { LogOut, LayoutDashboard, Shield } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { RightSidebar } from './RightSidebar';
import { ROUTES, ROLES } from '@/constants';

/**
 * Main layout shell for faculty/admin — sidebar + content area.
 * Preserves the desktop RightSidebar exactly, and exposes a compact header on mobile.
 */
export function AppShell() {
  const { logout, profile, roleName } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.LOGIN);
  };

  const isTeamLead = roleName === ROLES.TEAM_LEAD;
  const controlCenterPath = isTeamLead ? ROUTES.TEAM_LEAD_WORKSPACE : ROUTES.DASHBOARD;
  const displayName = profile?.person?.full_name ?? null;

  const initials = displayName
    ? displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const roleLabel =
    roleName === ROLES.FACULTY ? 'Faculty' :
    roleName === ROLES.TEAM_LEAD ? 'Team Lead' :
    roleName === ROLES.VOLUNTEER ? 'Volunteer' :
    roleName ?? 'User';

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50">
      {/* Mobile Top Header (Only visible on mobile viewports) */}
      <header className="md:hidden sticky top-0 z-20 bg-surface-950 text-white border-b border-surface-800 px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          {/* Profile Initials Avatar */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-xs font-black shadow-md shrink-0">
            {initials}
          </div>
          {/* Identity Info */}
          <div className="min-w-0">
            <p className="text-xs font-black text-white leading-none truncate">{displayName || 'User'}</p>
            <div className="flex items-center gap-0.5 mt-0.5">
              <Shield size={8} className="text-primary-400 shrink-0" />
              <span className="text-[8px] font-bold text-primary-300 uppercase tracking-widest shrink-0">{roleLabel}</span>
            </div>
          </div>
        </div>

        {/* Compact Navigation / Actions */}
        <div className="flex items-center gap-2">
          {/* Control Center Shortcut */}
          <button
            onClick={() => navigate(controlCenterPath)}
            className="p-2 rounded-xl text-surface-400 hover:text-primary-400 hover:bg-surface-800 transition-colors cursor-pointer flex items-center justify-center"
            title="Control Center"
            aria-label="Control Center"
          >
            <LayoutDashboard size={18} />
          </button>

          {/* Sign Out Action */}
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl text-surface-400 hover:text-red-400 hover:bg-red-950/40 transition-colors cursor-pointer flex items-center justify-center"
            aria-label="Sign Out"
            title="Sign Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fade-in">
          <Outlet />
        </div>
      </main>

      {/* Desktop Sidebar Panel (Only visible on medium viewports and up) */}
      <div className="hidden md:block shrink-0">
        <RightSidebar />
      </div>
    </div>
  );
}
