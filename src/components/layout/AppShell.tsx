import { useState, useRef, useEffect } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import {
  LogOut,
  Settings,
  Menu,
  X,
  Award,
  Camera,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ROUTES, ROLES } from '@/constants';

/**
 * Modern Application Shell:
 * - Right-side navigation sidebar is ONLY visible on the Control Center page.
 * - Right-side sidebar contains ONLY the profile photo (with custom upload/change option), username, designation, department, the Control Center button, and sign out.
 * - On all other pages/tabs, the right sidebar is hidden to give full canvas width, and the "⚙️ Control Center" button is prominently in the top header so users can return home.
 */
export function AppShell() {
  const { logout, profile, roleName, userId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Profile photo state with local storage persistence
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => {
    if (!userId) return null;
    return localStorage.getItem(`user_avatar_${userId}`);
  });

  useEffect(() => {
    if (userId) {
      const saved = localStorage.getItem(`user_avatar_${userId}`);
      if (saved) setAvatarUrl(saved);
    }
  }, [userId]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && userId) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setAvatarUrl(result);
        localStorage.setItem(`user_avatar_${userId}`, result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.LOGIN);
  };

  const isTeamLead = roleName === ROLES.TEAM_LEAD;
  const controlCenterPath = isTeamLead ? ROUTES.TEAM_LEAD_WORKSPACE : ROUTES.DASHBOARD;
  const isControlCenterPage = location.pathname === ROUTES.DASHBOARD || location.pathname === ROUTES.TEAM_LEAD_WORKSPACE;
  const displayName = profile?.person?.full_name ?? null;

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

  const designation = (profile?.person as { designation?: string | null })?.designation || roleLabel;
  const department = (profile?.person as { department?: string | null })?.department || 'School of Legal Studies';

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      {/* ─── Main Content Area (Left / Center) ─── */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen overflow-x-hidden">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-3 sm:px-6 py-2.5 shadow-2xs">
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            {/* Brand Logo & CivicForgeLabs Label */}
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <button
                onClick={() => navigate(controlCenterPath)}
                className="flex items-center gap-2 shrink-0 cursor-pointer focus:outline-none"
                title="Go to Control Center"
              >
                <img
                  src="/reva-logo.png"
                  alt="REVA University"
                  className="h-7 sm:h-9 w-auto object-contain"
                />
              </button>

              {/* CivicForgeLabs Identity Badge */}
              <div className="flex items-center border-l border-slate-200 pl-2 sm:pl-4 shrink-0">
                <span className="text-[11px] sm:text-xs font-black tracking-tight text-indigo-700 bg-indigo-50/80 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg sm:rounded-xl border border-indigo-100 shadow-2xs">
                  CivicForgeLabs
                </span>
              </div>
            </div>

            {/* Right Action Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              {/* If Team Lead: quick Switch to Volunteer button on top */}
              {isTeamLead && (
                <button
                  onClick={() => navigate(ROUTES.VOLUNTEER_HOME)}
                  className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] sm:text-xs font-bold border border-indigo-200/80 active:scale-95 transition-all cursor-pointer shadow-2xs"
                  title="Switch to Volunteer Mode"
                >
                  <ShieldCheck size={14} className="text-indigo-600 shrink-0" />
                  <span className="hidden xs:inline">Volunteer Mode</span>
                  <span className="xs:hidden">Volunteer</span>
                </button>
              )}

              {/* Control Center button on top */}
              <button
                onClick={() => navigate(controlCenterPath)}
                className="inline-flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-[11px] sm:text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                title="Return to Control Center"
              >
                <Settings size={14} className="shrink-0 animate-spin-hover" />
                <span className="hidden xs:inline">Control Center</span>
                <span className="xs:hidden">Control</span>
              </button>

              {/* Mobile Hamburger Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-1.5 sm:p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Toggle user profile"
              >
                {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Dropdown Profile Panel */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-slate-200 p-4 space-y-4 shadow-xl animate-fade-in">
            {/* User Profile info with Photo Upload */}
            <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
              <div className="relative group cursor-pointer shrink-0" onClick={() => fileInputRef.current?.click()}>
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-sm font-black overflow-hidden ring-2 ring-indigo-100">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="User Avatar" className="w-full h-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={16} />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 truncate">{displayName || 'User'}</p>
                <p className="text-[10px] font-bold text-indigo-600 truncate">{designation}</p>
                <p className="text-[9px] text-slate-400 truncate">{department}</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:underline"
                >
                  <Camera size={11} />
                  <span>Change Photo</span>
                </button>
              </div>
            </div>

            {isTeamLead && (
              <button
                onClick={() => {
                  navigate(ROUTES.VOLUNTEER_HOME);
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200"
              >
                <ShieldCheck size={15} />
                <span>Switch to Volunteer Mode</span>
              </button>
            )}

            <button
              onClick={() => {
                navigate(controlCenterPath);
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
            >
              <Settings size={15} />
              <span>Control Center</span>
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200"
            >
              <LogOut size={15} />
              <span>Sign Out</span>
            </button>
          </div>
        )}

        {/* Page Content View */}
        <main className="flex-1 flex flex-col p-3 sm:p-5 md:p-6 w-full max-w-7xl mx-auto overflow-x-hidden">
          <div className="flex-1">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ─── Permanent Right-Side Navigation Sidebar (ONLY in Control Center) ─── */}
      {isControlCenterPage && (
        <aside className="hidden lg:flex w-72 shrink-0 flex-col justify-between bg-white border-l border-slate-200/90 h-screen sticky top-0 z-20 shadow-2xs select-none p-5 animate-fade-in">
          {/* Hidden File Input for Profile Photo Upload */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoUpload}
            accept="image/*"
            className="hidden"
          />

          {/* Top Section: Profile Card & Designation */}
          <div className="space-y-6">
            {/* User Profile Card */}
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-5 shadow-md shadow-indigo-950/10 space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />

              <div className="flex items-center gap-3.5 relative z-10">
                {/* Clickable Profile Avatar with Camera Overlay */}
                <div
                  className="relative group/avatar cursor-pointer shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  title="Click to upload profile photo"
                >
                  <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-400 text-white flex items-center justify-center text-base font-black shadow-md shadow-indigo-500/30 ring-2 ring-white/30 overflow-hidden">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={displayName || 'User'} className="w-full h-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center text-white transition-opacity">
                    <Camera size={16} />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold text-white truncate leading-tight">
                    {displayName || 'User'}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <Award size={12} className="text-amber-400 shrink-0" />
                    <span className="text-[10px] font-bold text-indigo-200 truncate">{designation}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2 text-[10px] text-slate-300">
                <span className="truncate">{department}</span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 hover:underline shrink-0 cursor-pointer"
                >
                  <Camera size={11} />
                  <span>Change Photo</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Section: Sign Out Button */}
          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200/80 transition-all cursor-pointer shadow-2xs"
            >
              <LogOut size={15} />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}
