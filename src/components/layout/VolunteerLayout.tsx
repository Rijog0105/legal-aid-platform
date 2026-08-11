import { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { LogOut, ChevronLeft, Bell, X } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ROUTES, ROLES } from '@/constants';
import { fetchNotifications, markNotificationRead } from '@/features/attendance/services/attendanceService';
import type { Notification } from '@/types';

/**
 * Mobile-first layout for volunteers with bottom navigation and in-app Notification Center.
 */
export function VolunteerLayout() {
  const { logout, displayName, roleName, userId } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const isTeamLead = roleName === ROLES.TEAM_LEAD;

  const loadNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await fetchNotifications(userId);
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, [userId]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 20000); // Poll notifications every 20s
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
    <div className="flex flex-col min-h-screen bg-surface-50">
      {/* ─── Top Bar ─── */}
      <header className="sticky top-0 z-10 glass border-b border-surface-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isTeamLead && (
              <button
                onClick={() => navigate(ROUTES.TEAM_LEAD_WORKSPACE)}
                className="flex items-center gap-0.5 text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-1 rounded-lg border border-primary-100 hover:bg-primary-100 transition-colors cursor-pointer"
                title="Back to Team Lead Workspace"
              >
                <ChevronLeft size={14} />
                Workspace
              </button>
            )}
            <div>
              <h1 className="text-sm font-bold text-surface-900">Legal Aid Camp</h1>
              <p className="text-xs text-surface-500">{displayName || (isTeamLead ? 'Team Lead' : 'Volunteer')}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Notification Bell */}
            <button
              onClick={() => {
                setShowNotifications(true);
                loadNotifications();
              }}
              className="p-2 rounded-xl text-surface-400 hover:text-primary-600 hover:bg-primary-55 transition-colors cursor-pointer relative"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
              )}
            </button>

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-surface-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
              aria-label="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ─── Content ─── */}
      <main className="flex-1 p-4 pb-8 animate-fade-in">
        <Outlet />
      </main>

      {/* Notification Center Dialog Modal */}
      {showNotifications && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setShowNotifications(false)}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-surface-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100 bg-surface-50">
              <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider">Notifications</h3>
              <button
                onClick={() => setShowNotifications(false)}
                className="text-surface-400 hover:text-surface-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[300px] overflow-y-auto divide-y divide-surface-100">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-surface-400 italic">No notifications yet.</div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.is_read) handleMarkAsRead(n.id);
                      setShowNotifications(false);
                    }}
                    className={`p-3 text-xs leading-relaxed transition-all cursor-pointer hover:bg-surface-50/50 ${
                      !n.is_read ? 'bg-primary-50/20' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={`font-semibold ${!n.is_read ? 'text-primary-850 font-bold' : 'text-surface-850'}`}>
                        {n.title}
                      </span>
                      {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-primary-600 flex-shrink-0 mt-1" />}
                    </div>
                    <p className="text-surface-500 mt-0.5">{n.message}</p>
                    <p className="text-[9px] text-surface-400 mt-1">
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
