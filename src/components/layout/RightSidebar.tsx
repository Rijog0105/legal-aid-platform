import { useNavigate } from 'react-router-dom';
import { LogOut, LayoutDashboard, Shield, Mail, Phone, ChevronRight, FolderKanban, Users, FileText } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ROUTES, ROLES } from '@/constants';

export function RightSidebar() {
  const { logout, profile, roleName } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.LOGIN);
  };

  const isTeamLead = roleName === ROLES.TEAM_LEAD;
  const controlCenterPath = isTeamLead ? ROUTES.TEAM_LEAD_WORKSPACE : ROUTES.DASHBOARD;

  /* ── Profile data from authenticated session ── */
  const person = profile?.person;
  const displayName = person?.full_name ?? null;
  const email = person?.email ?? null;
  const phone = person?.phone ?? null;
  const designation = person?.designation ?? null;
  const department = (person as { department?: string | null })?.department ?? null;

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
      ? 'Student Volunteer'
      : roleName ?? 'User';

  return (
    <aside className="w-64 shrink-0 flex flex-col bg-slate-950 text-slate-100 border-l border-slate-800/80 h-screen max-h-screen sticky top-0 overflow-y-auto print:hidden shadow-xl">
      {/* ── User Profile Card ── */}
      <div className="pt-8 px-5 pb-5 flex flex-col items-center text-center border-b border-slate-800/60">
        <div className="relative mb-3.5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-indigo-400 flex items-center justify-center text-white text-lg font-black shadow-lg shadow-indigo-500/20 ring-2 ring-white/10">
            {initials}
          </div>
          <span
            className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-950 shadow-xs"
            title="Online & Synchronized"
          />
        </div>

        <p className="text-sm font-bold text-white tracking-tight line-clamp-1">
          {displayName ?? 'Institutional User'}
        </p>

        {designation ? (
          <p className="text-[11px] font-medium text-slate-400 mt-0.5">{designation}</p>
        ) : department ? (
          <p className="text-[11px] font-medium text-slate-400 mt-0.5">{department}</p>
        ) : null}

        <div className="inline-flex items-center gap-1.5 mt-2.5 px-2.5 py-1 rounded-full bg-indigo-950/80 border border-indigo-800/60">
          <Shield size={10} className="text-indigo-400 shrink-0" />
          <span className="text-[10px] font-bold text-indigo-300 tracking-wide uppercase">
            {roleLabel}
          </span>
        </div>
      </div>

      {/* ── Contact Details ── */}
      {(email || phone) && (
        <div className="px-5 py-4 space-y-3 border-b border-slate-800/60 text-xs">
          {email && (
            <div className="space-y-0.5">
              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <Mail size={11} className="text-indigo-400" />
                <span>Email</span>
              </div>
              <p className="text-slate-300 font-medium truncate" title={email}>
                {email}
              </p>
            </div>
          )}

          {phone && (
            <div className="space-y-0.5">
              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <Phone size={11} className="text-emerald-400" />
                <span>Contact</span>
              </div>
              <p className="text-slate-300 font-medium">{phone}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Quick Navigation Section ── */}
      <div className="px-4 py-4 space-y-1.5 flex-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">
          Navigation
        </p>

        <button
          onClick={() => navigate(controlCenterPath)}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800/70 border border-transparent hover:border-slate-700/60 transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2.5">
            <LayoutDashboard size={15} className="text-indigo-400 group-hover:scale-110 transition-transform" />
            <span>{isTeamLead ? 'Workspace' : 'Control Center'}</span>
          </div>
          <ChevronRight size={13} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
        </button>

        {!isTeamLead && (
          <>
            <button
              onClick={() => navigate(ROUTES.PROJECTS)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800/70 border border-transparent hover:border-slate-700/60 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <FolderKanban size={15} className="text-blue-400 group-hover:scale-110 transition-transform" />
                <span>Projects</span>
              </div>
              <ChevronRight size={13} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
            </button>

            <button
              onClick={() => navigate(ROUTES.PEOPLE)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800/70 border border-transparent hover:border-slate-700/60 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <Users size={15} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                <span>People Registry</span>
              </div>
              <ChevronRight size={13} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
            </button>

            <button
              onClick={() => navigate(ROUTES.SURVEYS)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800/70 border border-transparent hover:border-slate-700/60 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <FileText size={15} className="text-purple-400 group-hover:scale-110 transition-transform" />
                <span>Survey Analytics</span>
              </div>
              <ChevronRight size={13} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
            </button>
          </>
        )}
      </div>

      {/* ── Institutional Branding & Logout ── */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/90 space-y-3">
        <div className="text-center select-none py-1">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold">
            <span className="text-[#F37021]">REVA</span>
            <span className="text-slate-300">University</span>
          </div>
          <p className="text-[10px] text-slate-400 tracking-tight mt-0.5">Civic Forge Labs Platform</p>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl text-xs font-semibold text-slate-400 hover:text-red-400 hover:bg-red-950/40 border border-slate-800 hover:border-red-900/50 transition-all cursor-pointer"
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
