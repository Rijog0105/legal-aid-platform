import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Tent,
  Users,
  LogOut,
  Scale,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ROUTES, ROLES, APP_CONFIG } from '@/constants';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { logout, displayName, roleName } = useAuth();
  const navigate = useNavigate();

  const isTeamLead = roleName === ROLES.TEAM_LEAD;

  const navItems: NavItem[] = isTeamLead
    ? [
        { label: 'Workspace', path: ROUTES.TEAM_LEAD_WORKSPACE, icon: <LayoutDashboard className="w-5 h-5" /> },
        { label: 'Activity Photos', path: ROUTES.TEAM_LEAD_PHOTOS, icon: <Tent className="w-5 h-5" /> },
      ]
    : [
        { label: 'Control Center', path: ROUTES.DASHBOARD, icon: <LayoutDashboard className="w-5 h-5" /> },
        { label: 'Legal Aid Projects', path: ROUTES.PROJECTS, icon: <Tent className="w-5 h-5" /> },
        { label: 'People', path: ROUTES.PEOPLE, icon: <Users className="w-5 h-5" /> },
      ];

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.LOGIN);
  };

  return (
    <aside
      className={`
        flex flex-col h-screen sticky top-0
        bg-surface-950 text-white
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-[72px]' : 'w-64'}
      `}
    >
      {/* ─── Logo ─── */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center flex-shrink-0">
          <Scale className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span className="text-sm font-bold tracking-tight truncate">
            {APP_CONFIG.APP_SHORT_NAME}
          </span>
        )}
      </div>

      {/* ─── Navigation ─── */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
              transition-all duration-200
              ${isActive
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25'
                : 'text-surface-400 hover:text-white hover:bg-white/5'
              }
            `}
          >
            {item.icon}
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* ─── User & Collapse ─── */}
      <div className="border-t border-white/10 p-3 space-y-2">
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="w-full flex items-center justify-center p-2 rounded-xl
                     text-surface-400 hover:text-white hover:bg-white/5
                     transition-colors cursor-pointer"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* User info */}
        <div className={`flex items-center gap-3 px-3 py-2 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">
            {displayName?.charAt(0)?.toUpperCase() || '?'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{displayName || 'User'}</p>
              <p className="text-[10px] text-surface-400 capitalize">{roleName || ''}</p>
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className={`
            flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium
            text-surface-400 hover:text-red-400 hover:bg-red-500/10
            transition-colors cursor-pointer
            ${collapsed ? 'justify-center' : ''}
          `}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
