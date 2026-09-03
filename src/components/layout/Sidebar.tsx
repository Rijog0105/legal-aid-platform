import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  LogOut,
  FileBarChart,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ROUTES, ROLES } from '@/constants';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

export function Sidebar() {
  const { logout, displayName, roleName, profile } = useAuth();
  const navigate = useNavigate();

  const isTeamLead = roleName === ROLES.TEAM_LEAD;

  const navItems: NavItem[] = isTeamLead
    ? [
        { label: 'Team Lead Workspace', path: ROUTES.TEAM_LEAD_WORKSPACE, icon: <LayoutDashboard size={18} /> },
        { label: 'Activity Photos', path: ROUTES.TEAM_LEAD_PHOTOS, icon: <FolderKanban size={18} /> },
        { label: 'Surveys & Reports', path: ROUTES.TEAM_LEAD_SURVEYS, icon: <FileBarChart size={18} /> },
      ]
    : [
        { label: 'Control Center', path: ROUTES.DASHBOARD, icon: <LayoutDashboard size={18} /> },
        { label: 'Legal Aid Projects', path: ROUTES.PROJECTS, icon: <FolderKanban size={18} /> },
        { label: 'People Registry', path: ROUTES.PEOPLE, icon: <Users size={18} /> },
        { label: 'Survey Analytics', path: ROUTES.SURVEYS, icon: <FileBarChart size={18} /> },
      ];

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.LOGIN);
  };

  const initials = displayName
    ? displayName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  const roleLabel =
    roleName === ROLES.FACULTY
      ? 'Faculty Coordinator'
      : roleName === ROLES.TEAM_LEAD
      ? 'Team Lead'
      : roleName === ROLES.VOLUNTEER
      ? 'Volunteer'
      : roleName ?? 'User';

  const department = (profile?.person as { department?: string | null })?.department;

  return (
    <aside className="w-64 shrink-0 flex flex-col bg-white border-r border-slate-200/90 h-screen sticky top-0 z-20 shadow-xs select-none">
      {/* ─── Institutional Logo Header ─── */}
      <div className="flex items-center gap-3 px-5 h-20 border-b border-slate-100 bg-white">
        <img
          src="/reva-logo.png"
          alt="REVA University Logo"
          className="h-10 w-auto object-contain max-w-[170px]"
        />
      </div>

      {/* ─── Main Navigation ─── */}
      <nav className="flex-1 py-5 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Main Navigation
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold
              transition-all duration-150 cursor-pointer
              ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }
            `}
          >
            {({ isActive }) => (
              <>
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-indigo-600' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </div>
                {isActive && <ChevronRight size={14} className="text-indigo-400" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ─── Bottom User Profile Card & Sign Out ─── */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-2">
        <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate leading-tight">
              {displayName || 'Institutional User'}
            </p>
            <p className="text-[10px] font-medium text-slate-400 truncate">
              {roleLabel} {department ? `• ${department}` : ''}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all cursor-pointer"
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
