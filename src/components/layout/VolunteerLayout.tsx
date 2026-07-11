import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Camera, ClipboardList, Home, LogOut } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ROUTES } from '@/constants';

/**
 * Mobile-first layout for volunteers with bottom navigation.
 */
export function VolunteerLayout() {
  const { logout, displayName } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.LOGIN);
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface-50">
      {/* ─── Top Bar ─── */}
      <header className="sticky top-0 z-10 glass border-b border-surface-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-surface-900">Legal Aid Camp</h1>
            <p className="text-xs text-surface-500">{displayName || 'Volunteer'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl text-surface-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
            aria-label="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ─── Content ─── */}
      <main className="flex-1 p-4 pb-24 animate-fade-in">
        <Outlet />
      </main>

      {/* ─── Bottom Navigation ─── */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 glass border-t border-surface-200">
        <div className="flex items-center justify-around py-2">
          <NavLink
            to={ROUTES.VOLUNTEER_HOME}
            end
            className={({ isActive }) => `
              flex flex-col items-center gap-1 px-4 py-2 rounded-xl text-xs font-medium
              transition-colors
              ${isActive ? 'text-primary-600' : 'text-surface-400'}
            `}
          >
            <Home className="w-5 h-5" />
            <span>Home</span>
          </NavLink>
          <NavLink
            to={ROUTES.VOLUNTEER_CAPTURE}
            className={({ isActive }) => `
              flex flex-col items-center gap-1 px-4 py-2 rounded-xl text-xs font-medium
              transition-colors
              ${isActive ? 'text-primary-600' : 'text-surface-400'}
            `}
          >
            <Camera className="w-5 h-5" />
            <span>Capture</span>
          </NavLink>
          <NavLink
            to={ROUTES.VOLUNTEER_SUBMISSIONS}
            className={({ isActive }) => `
              flex flex-col items-center gap-1 px-4 py-2 rounded-xl text-xs font-medium
              transition-colors
              ${isActive ? 'text-primary-600' : 'text-surface-400'}
            `}
          >
            <ClipboardList className="w-5 h-5" />
            <span>My Work</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
