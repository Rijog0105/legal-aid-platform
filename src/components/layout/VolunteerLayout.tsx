import { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { LogOut, ChevronLeft, Bell, X } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ROUTES, ROLES } from '@/constants';
import { fetchNotifications, markNotificationRead } from '@/features/attendance/services/attendanceService';
import type { Notification } from '@/types';
import { supabase } from '@/services/supabase';

/**
 * Mobile-first field layout for volunteers with modern top bar and in-app Notification Center.
 */
export function VolunteerLayout() {
  const { logout, displayName, roleName, userId } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<Array<Notification & { is_expired?: boolean }>>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const isTeamLead = roleName === ROLES.TEAM_LEAD;

  const loadNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await fetchNotifications(userId);
      
      const sessionIds = data
        .map((n) => {
          const match = n.link?.match(/session_id=([^&]+)/);
          return match ? match[1] : null;
        })
        .filter((id): id is string => !!id);

      if (sessionIds.length > 0) {
        const { data: sessions } = await supabase
          .from('attendance_sessions')
          .select('id, status, expires_at')
          .in('id', sessionIds);

        if (sessions) {
          const sessionMap = new Map<string, { status: string; expires_at: string }>();
          (sessions as Array<{ id: string; status: string; expires_at: string }>).forEach((s) =>
            sessionMap.set(s.id, { status: s.status, expires_at: s.expires_at })
          );

          const mappedNotifications = data.map((n) => {
            const match = n.link?.match(/session_id=([^&]+)/);
            const sId = match ? match[1] : null;
            const sessionInfo = sId ? sessionMap.get(sId) : null;
            
            if (sessionInfo) {
              const isExpired = sessionInfo.status === 'closed' || new Date(sessionInfo.expires_at) <= new Date();
              return { ...n, is_expired: isExpired };
            }
            return n;
          });

          setNotifications(mappedNotifications);
          return;
        }
      }

      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, [userId]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 20000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.LOGIN);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
      {/* ─── Modern App Header Bar ─── */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-3 sm:px-4 py-2.5 shadow-2xs">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
            <img
              src="/reva-logo.png"
              alt="REVA University"
              className="h-7 sm:h-8 w-auto object-contain shrink-0"
            />

            <div className="flex items-center border-l border-slate-200 pl-1.5 sm:pl-2 shrink-0">
              <span className="text-[10px] sm:text-[11px] font-black tracking-tight text-indigo-700 bg-indigo-50/80 px-1.5 py-0.5 rounded-md sm:rounded-lg border border-indigo-100 shadow-2xs">
                CivicForgeLabs
              </span>
            </div>

            <div className="border-l border-slate-200 pl-1.5 sm:pl-2 min-w-0">
              <p className="text-[11px] font-bold text-slate-900 leading-tight truncate max-w-[80px] xs:max-w-[120px]">
                {displayName || (isTeamLead ? 'Team Lead' : 'Volunteer')}
              </p>
              <span className="text-[9px] font-extrabold text-indigo-600 uppercase tracking-wider block truncate">
                {isTeamLead ? 'Team Lead' : 'Volunteer'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Single Team Lead switch-back button on top */}
            {isTeamLead && (
              <button
                onClick={() => navigate(ROUTES.TEAM_LEAD_WORKSPACE)}
                className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold text-white bg-indigo-600 px-2 sm:px-3 py-1.5 rounded-xl shadow-xs hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer shrink-0"
                title="Switch back to Team Lead Workspace"
              >
                <ChevronLeft size={13} className="shrink-0" />
                <span className="hidden xs:inline">Back to Team Lead</span>
                <span className="xs:hidden">Team Lead</span>
              </button>
            )}

            {/* Notification Bell */}
            <button
              onClick={() => {
                setShowNotifications(true);
                loadNotifications();
              }}
              className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer relative"
              aria-label="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
              )}
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              aria-label="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* ─── Main Content Container ─── */}
      <main className="flex-1 p-4 sm:p-6 pb-6 animate-fade-in max-w-lg mx-auto w-full flex flex-col justify-between">
        <div className="flex-1">
          <Outlet />
        </div>
      </main>

      {/* Notification Center Dialog Modal */}
      {showNotifications && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in"
          onClick={(e) => e.target === e.currentTarget && setShowNotifications(false)}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Field Alerts & Roll Calls</h3>
              <button
                onClick={() => setShowNotifications(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-100">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 italic">No new notifications.</div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.is_read) handleMarkAsRead(n.id);
                      setShowNotifications(false);
                      if (!n.is_expired && n.link) {
                        navigate(n.link);
                      }
                    }}
                    className={`p-3.5 text-xs leading-relaxed transition-all ${
                      n.is_expired
                        ? 'opacity-60 cursor-not-allowed'
                        : 'cursor-pointer hover:bg-slate-50'
                    } ${!n.is_read && !n.is_expired ? 'bg-indigo-50/30' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={`font-bold ${!n.is_read && !n.is_expired ? 'text-indigo-700' : 'text-slate-800'}`}>
                        {n.is_expired ? `${n.title} (Expired)` : n.title}
                      </span>
                      {!n.is_read && !n.is_expired && <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1" />}
                    </div>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      {n.is_expired
                        ? 'This attendance session has ended and is closed.'
                        : n.message}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">
                      {new Date(n.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
