import { useNavigate } from 'react-router-dom';
import { LogOut, LayoutDashboard, Shield, Mail, Phone } from 'lucide-react';
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

  /* ── Profile data — all from authenticated session, nothing hard-coded ── */
  const person = profile?.person;
  const displayName = person?.full_name ?? null;
  const email = person?.email ?? null;
  const phone = person?.phone ?? null;
  const designation = person?.designation ?? null;
  const department = (person as { department?: string | null })?.department ?? null;

  /* Initials avatar — profile photo field does not exist in schema, deferred */
  const initials = displayName
    ? displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const roleLabel =
    roleName === ROLES.FACULTY ? 'Faculty Coordinator' :
    roleName === ROLES.TEAM_LEAD ? 'Team Lead' :
    roleName === ROLES.VOLUNTEER ? 'Volunteer' :
    roleName ?? 'User';

  return (
    <aside className="w-60 shrink-0 flex flex-col bg-surface-950 border-l border-surface-800 h-screen max-h-screen sticky top-0 overflow-hidden print:hidden">

      {/* ── Profile — top padding creates breathing room from browser edge ── */}
      <div className="pt-24 px-5 pb-5 flex flex-col items-center text-center">
        {/* Avatar — initials, gradient tile, fully rounded */}
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-xl font-black shadow-lg mb-4 ring-2 ring-white ring-opacity-10 relative">
          {initials}
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-surface-950" />
        </div>

        {/* Name */}
        <p className="text-sm font-black text-white leading-snug tracking-tight">
          {displayName ?? '—'}
        </p>

        {/* Designation or department */}
        {designation ? (
          <p className="text-xs font-medium text-surface-400 mt-1">{designation}</p>
        ) : department ? (
          <p className="text-xs font-medium text-surface-400 mt-1">{department}</p>
        ) : null}

        {/* Role badge */}
        <div className="flex items-center gap-1 mt-2 px-2 py-1 rounded-full bg-primary-900 border border-primary-800">
          <Shield size={9} className="text-primary-400" />
          <span className="text-xs font-bold text-primary-300 uppercase tracking-widest" style={{ fontSize: '9px' }}>
            {roleLabel}
          </span>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="mx-5 border-t border-surface-800" />

      {/* ── Contact info ── */}
      <div className="px-5 pt-4 pb-2 space-y-4">
        {email && (
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Mail size={10} className="text-surface-500" />
              <span className="text-surface-500 font-bold uppercase tracking-wider" style={{ fontSize: '9px' }}>Email</span>
            </div>
            <p className="text-xs font-semibold text-surface-300 truncate" title={email}>{email}</p>
          </div>
        )}
        {phone && (
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Phone size={10} className="text-surface-500" />
              <span className="text-surface-500 font-bold uppercase tracking-wider" style={{ fontSize: '9px' }}>Phone</span>
            </div>
            <p className="text-xs font-semibold text-surface-300">{phone}</p>
          </div>
        )}
      </div>

      {/* ── Flexible spacer to push CC tile down ── */}
      <div className="flex-grow" />

      {/* ── Organization Branding ── */}
      <div className="text-center pt-3 pb-5 select-none flex flex-col gap-1.5">
        <h4 className="text-base font-semibold tracking-wide">
          <span className="text-orange-500">REVA</span>{' '}
          <span className="text-slate-200">University</span>
        </h4>
        <h3 className="text-base font-semibold text-slate-200 tracking-wide">
          Civic Forge Labs
        </h3>
      </div>

      {/* ── Control Center — centered rectangular tile, NOT full-width ── */}
      {!isTeamLead && (
        <div className="pb-4 flex justify-center">
          <button
            onClick={() => navigate(controlCenterPath)}
            style={{ width: '160px', height: '100px' }}
            className="flex flex-col items-center justify-center gap-2 bg-[#1e293b]/70 border border-slate-800 rounded-3xl shadow-md cursor-pointer transition-all duration-200 ease-out hover:bg-[#1e293b] hover:border-slate-700 hover:shadow-lg group"
          >
            <LayoutDashboard
              size={22}
              className="text-primary-400 group-hover:text-primary-300 transition-colors duration-150"
            />
            <div className="text-center leading-none">
              <p className="font-extrabold text-white uppercase tracking-widest" style={{ fontSize: '10px' }}>CONTROL</p>
              <p className="font-extrabold text-white uppercase tracking-widest mt-0.5" style={{ fontSize: '10px' }}>CENTER</p>
            </div>
          </button>
        </div>
      )}

      {/* ── Spacer between Control Center and Sign Out ── */}
      <div className="h-10" />

      {/* ── Sign Out — subordinate, bottom ── */}
      <div className="mx-4 mb-5 border-t border-surface-800 pt-4">
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl text-xs font-semibold text-surface-500 hover:text-red-400 hover:bg-red-950 border border-transparent hover:border-red-900 transition-all duration-150 cursor-pointer"
        >
          <LogOut size={12} />
          <span>Sign Out</span>
        </button>
        <span className="block text-[9px] text-surface-650 text-center mt-2 font-mono">v1.0.0</span>
      </div>
    </aside>
  );
}
