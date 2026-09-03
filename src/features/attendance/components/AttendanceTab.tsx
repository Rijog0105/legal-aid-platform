import { useState, useEffect, useCallback } from 'react';
import { Card, Button, Spinner } from '@/components/ui';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ROLES } from '@/constants';
import {
  createAttendanceSession,
  closeAttendanceSession,
  fetchActiveSessions,
  fetchSessionDashboardData,
  fetchCompletedSessionsWithStats,
  type DashboardAttendee,
} from '../services/attendanceService';
import type { AttendanceSession } from '@/types';
import {
  Play,
  Square,
  RefreshCw,
  MapPin,
  Clock,
  Compass,
  CheckCircle,
  XCircle,
  AlertTriangle,
  AlertCircle,
  Calendar,
  History,
  ArrowRight,
} from 'lucide-react';
import { AttendanceSummary } from './AttendanceSummary';
import { formatDate } from '@/utils';
import { useGeolocation } from '@/hooks/useGeolocation';

interface AttendanceTabProps {
  campId: string;
  phase: 'survey' | 'camp';
}

type ViewMode = 'current' | 'history';

export function AttendanceTab({ campId, phase }: AttendanceTabProps) {
  const { userId, hasRole } = useAuth();
  const isFaculty = hasRole([ROLES.FACULTY, ROLES.ADMIN]);

  const storageKeyViewMode = `attendance_view_mode_${campId}_${phase}`;
  const storageKeySelectedSessionId = `attendance_selected_session_id_${campId}_${phase}`;

  // View state restored from localStorage
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(storageKeyViewMode);
    return (saved as ViewMode) || 'current';
  });

  // Active Session State
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Form State (Start Session)
  const [sessionType, setSessionType] = useState<'check_in' | 'check_out'>('check_in');
  const [radius, setRadius] = useState<number>(100);
  const [duration, setDuration] = useState<number>(15);
  const {
    coords: facultyCoords,
    isLoading: gpsLoading,
    error: gpsError,
    permissionState,
    captureLocation
  } = useGeolocation();

  // Live Dashboard State
  const [attendees, setAttendees] = useState<DashboardAttendee[]>([]);
  const [stats, setStats] = useState({ present: 0, pending: 0, rejected: 0, outside: 0 });
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');

  // History State
  const [completedSessions, setCompletedSessions] = useState<Array<AttendanceSession & { present_count: number; total_roster: number }>>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);

  // 1. Fetch current active session (Restores Live dashboard if one is open in DB)
  const checkActiveSession = useCallback(async () => {
    setLoadingSession(true);
    setSessionError(null);
    try {
      const active = await fetchActiveSessions(campId, phase);
      if (active.length > 0) {
        setActiveSession(active[0]);
        // Always override and show the live monitoring dashboard if one is open in DB
        setViewMode('current');
        localStorage.setItem(storageKeyViewMode, 'current');
      } else {
        setActiveSession(null);
      }
    } catch (err) {
      setSessionError(err instanceof Error ? err.message : 'Failed to fetch attendance sessions');
    } finally {
      setLoadingSession(false);
    }
  }, [campId, phase, storageKeyViewMode]);

  useEffect(() => {
    checkActiveSession();
  }, [checkActiveSession]);

  // 2. Fetch completed sessions list and restore selected session
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    setHistoryError(null);
    try {
      const data = await fetchCompletedSessionsWithStats(campId, phase);
      setCompletedSessions(data);

      const savedSessionId = localStorage.getItem(storageKeySelectedSessionId);
      if (savedSessionId) {
        const match = data.find((s) => s.id === savedSessionId);
        if (match) {
          setSelectedSession(match);
        }
      }
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : 'Failed to load completed sessions history');
    } finally {
      setLoadingHistory(false);
    }
  }, [campId, phase, storageKeySelectedSessionId]);

  // Load history if viewMode is 'history' on mount/change
  useEffect(() => {
    if (viewMode === 'history') {
      loadHistory();
    }
  }, [viewMode, loadHistory]);

  // Live Dashboard polling & Time Countdown
  const loadDashboard = useCallback(async () => {
    if (!activeSession) return;
    setLoadingDashboard(true);
    setDashboardError(null);
    try {
      const data = await fetchSessionDashboardData(activeSession.id, campId);
      setAttendees(data.attendees);
      setStats(data.stats);
    } catch (err) {
      setDashboardError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setLoadingDashboard(false);
    }
  }, [activeSession, campId]);

  useEffect(() => {
    if (!activeSession) return;

    loadDashboard();
    const pollInterval = setInterval(loadDashboard, 10000); // Poll every 10 seconds

    return () => clearInterval(pollInterval);
  }, [activeSession, loadDashboard]);

  // Expiry / Countdown Timer
  useEffect(() => {
    if (!activeSession) return;

    const updateTimer = () => {
      const expiry = new Date(activeSession.expires_at).getTime();
      const now = new Date().getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        checkActiveSession(); // Re-trigger state lookup
      } else {
        const min = Math.floor(diff / 60000);
        const sec = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${min}m ${sec}s remaining`);
      }
    };

    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);

    return () => clearInterval(timerInterval);
  }, [activeSession, checkActiveSession]);

  // Navigation callbacks
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(storageKeyViewMode, mode);
    setSelectedSession(null);
    localStorage.removeItem(storageKeySelectedSessionId);
  };

  const handleSelectSession = (session: AttendanceSession | null) => {
    setSelectedSession(session);
    if (session) {
      localStorage.setItem(storageKeySelectedSessionId, session.id);
    } else {
      localStorage.removeItem(storageKeySelectedSessionId);
    }
  };



  // Start Session handler
  const handleStartSession = async () => {
    if (!userId || !facultyCoords) return;
    try {
      const session = await createAttendanceSession({
        camp_id: campId,
        phase,
        session_type: sessionType,
        created_by: userId,
        faculty_latitude: facultyCoords.latitude,
        faculty_longitude: facultyCoords.longitude,
        faculty_gps_accuracy: facultyCoords.accuracy ?? undefined,
        radius_meters: radius,
        duration_minutes: duration,
      });
      setActiveSession(session);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to start session');
    }
  };

  // Close Session handler
  const handleCloseSession = async () => {
    if (!activeSession) return;
    if (!window.confirm('Are you sure you want to close this attendance session? Check-in will be closed.')) return;
    try {
      await closeAttendanceSession(activeSession.id);
      
      // Load history so the closed session appears immediately
      await loadHistory();
      
      // Open the summary card of the closed session
      handleSelectSession(activeSession);
      setViewMode('history');
      localStorage.setItem(storageKeyViewMode, 'history');
      setActiveSession(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to close session');
    }
  };

  if (!isFaculty) {
    return (
      <Card className="p-6 text-center space-y-3">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h3 className="text-base font-bold text-surface-900 font-semibold">Attendance Management Locked</h3>
        <p className="text-xs text-surface-500 max-w-md mx-auto leading-relaxed">
          Attendance dashboard monitoring and sessions control are restricted to Faculty Coordinators and Administrators.
        </p>
      </Card>
    );
  }

  if (loadingSession) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header View Switcher Toggle ─── */}
      <div className="w-full flex justify-center">
        <div className="flex bg-surface-150 p-1.5 rounded-2xl border border-surface-200/50 max-w-xs w-full shadow-sm">
          <button
            onClick={() => handleViewModeChange('current')}
            className={`flex-1 text-center py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'current'
                ? 'bg-white text-surface-900 shadow-sm border border-surface-200/10'
                : 'text-surface-500 hover:text-surface-800'
            }`}
          >
            Current Session
          </button>
          <button
            onClick={() => handleViewModeChange('history')}
            className={`flex-1 text-center py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'history'
                ? 'bg-white text-surface-900 shadow-sm border border-surface-250/10'
                : 'text-surface-500 hover:text-surface-800'
            }`}
          >
            Attendance History
          </button>
        </div>
      </div>

      {sessionError && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          {sessionError}
        </div>
      )}

      {/* ─── VIEW 1: CURRENT SESSION WORKSPACE ─── */}
      {viewMode === 'current' && (
        <>
          {activeSession ? (
            /* Active Live Dashboard */
            <div className="space-y-6">
              {/* Header Panel */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 flex items-center justify-between border-l-4 border-l-primary-500">
                  <div>
                    <span className="text-[10px] text-surface-400 block uppercase tracking-wider">Active Session</span>
                    <span className="font-extrabold text-surface-900 text-sm">
                      {activeSession.session_type === 'check_in' ? 'Check-In Session' : 'Check-Out Session'}
                    </span>
                    <span className="text-[10px] text-surface-400 block mt-0.5">
                      Started at {new Date(activeSession.starts_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <Play className="w-8 h-8 text-primary-500/80" />
                </Card>

                <Card className="p-4 flex items-center justify-between border-l-4 border-l-amber-500">
                  <div>
                    <span className="text-[10px] text-surface-400 block uppercase tracking-wider">Time Remaining</span>
                    <span className="font-extrabold text-amber-700 text-sm">{timeLeft}</span>
                    <span className="text-[10px] text-surface-400 block mt-0.5">
                      Duration: {activeSession.duration_minutes} minutes
                    </span>
                  </div>
                  <Clock className="w-8 h-8 text-amber-500/80" />
                </Card>

                <Card className="p-4 flex items-center justify-between border-l-4 border-l-emerald-500">
                  <div>
                    <span className="text-[10px] text-surface-400 block uppercase tracking-wider">Settings</span>
                    <span className="font-extrabold text-emerald-800 text-sm">Radius: {activeSession.radius_meters}m</span>
                    <span className="text-[10px] text-surface-400 block mt-0.5">
                      GPS: {activeSession.faculty_latitude.toFixed(4)}, {activeSession.faculty_longitude.toFixed(4)}
                    </span>
                  </div>
                  <Compass className="w-8 h-8 text-emerald-500/80" />
                </Card>
              </div>

              {/* Quick Metrics Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-emerald-700 block uppercase tracking-wider font-semibold">Present</span>
                    <span className="text-xl font-extrabold text-emerald-900">{stats.present}</span>
                  </div>
                  <CheckCircle className="w-6 h-6 text-emerald-600 opacity-80" />
                </div>

                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-amber-700 block uppercase tracking-wider font-semibold">Pending</span>
                    <span className="text-xl font-extrabold text-amber-900">{stats.pending}</span>
                  </div>
                  <Clock className="w-6 h-6 text-amber-600 opacity-80" />
                </div>

                <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-red-700 block uppercase tracking-wider font-semibold">Rejected</span>
                    <span className="text-xl font-extrabold text-red-900">{stats.rejected}</span>
                  </div>
                  <XCircle className="w-6 h-6 text-red-600 opacity-80" />
                </div>

                <div className="p-3 bg-violet-50 border border-violet-100 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-violet-700 block uppercase tracking-wider font-semibold">Outside Radius</span>
                    <span className="text-xl font-extrabold text-violet-900">{stats.outside}</span>
                  </div>
                  <MapPin className="w-6 h-6 text-violet-600 opacity-80" />
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between gap-3">
                <Button size="sm" variant="outline" leftIcon={<RefreshCw size={14} />} onClick={loadDashboard} isLoading={loadingDashboard}>
                  Refresh Now
                </Button>
                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white border-red-600" leftIcon={<Square size={14} />} onClick={handleCloseSession}>
                  End Attendance Session
                </Button>
              </div>

              {/* Live Attendee Table (Desktop & Mobile Responsive Layouts) */}
              {dashboardError && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                  <AlertCircle size={13} className="flex-shrink-0" />
                  {dashboardError}
                </div>
              )}

              <Card className="overflow-hidden border border-surface-200 shadow-sm rounded-2xl">
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-xs text-left text-surface-600 divide-y divide-surface-100">
                    <thead className="bg-surface-50 text-surface-550 uppercase font-bold">
                      <tr>
                        <th className="px-5 py-3">Name</th>
                        <th className="px-5 py-3">Roster Role</th>
                        <th className="px-5 py-3">Check-In Time</th>
                        <th className="px-5 py-3">Faculty Distance</th>
                        <th className="px-5 py-3">GPS Verification</th>
                        <th className="px-5 py-3">Attendance Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100 bg-white">
                      {attendees.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-xs text-surface-400 italic">
                            No volunteers or team leads assigned to this project roster.
                          </td>
                        </tr>
                      ) : (
                        attendees.map((attendee) => (
                          <tr key={attendee.user_id} className="hover:bg-surface-50/50">
                            <td className="px-5 py-3 text-surface-900">
                              <span className="font-semibold block">{attendee.name}</span>
                              {attendee.category === 'student' && attendee.usn_employee_id && (
                                <span className="text-[10px] text-surface-500 font-medium block mt-0.5">
                                  SRN: <span className="font-mono">{attendee.usn_employee_id.replace(/^SRN:\s*/i, '')}</span>
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-surface-500">{attendee.role}</td>
                            <td className="px-5 py-3">
                              {attendee.check_in_time
                                ? new Date(attendee.check_in_time).toLocaleTimeString('en-IN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                  })
                                : '—'}
                            </td>
                            <td className="px-5 py-3">
                              {attendee.distance !== null ? (
                                <span className={attendee.gps_status === 'Outside Radius' || attendee.status === 'rejected' ? 'font-black text-red-600' : 'text-surface-700'}>
                                  {attendee.distance} m
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="px-5 py-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                  attendee.gps_status === 'Within Radius'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : attendee.gps_status === 'Outside Radius'
                                    ? 'bg-red-100 text-red-800 border border-red-200'
                                    : attendee.gps_status === 'No GPS'
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-surface-100 text-surface-600'
                                }`}
                              >
                                {attendee.gps_status}
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              {attendee.status === 'rejected' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase bg-red-100 text-red-800 border border-red-300 shadow-2xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                                  REJECTED (OUT OF RADIUS)
                                </span>
                              ) : (
                                <span
                                  className={`px-2 py-1 rounded-lg text-[9px] font-extrabold uppercase ${
                                    attendee.status === 'present'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {attendee.status}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Stacked layout for Mobile */}
                <div className="sm:hidden divide-y divide-surface-150 bg-white">
                  {attendees.length === 0 ? (
                    <div className="text-center py-6 text-xs text-surface-400 italic">No roster members assigned.</div>
                  ) : (
                    attendees.map((attendee) => (
                      <div key={attendee.user_id} className={`p-4 space-y-2 hover:bg-surface-50/50 ${attendee.status === 'rejected' ? 'bg-red-50/30' : ''}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-col">
                            <span className="font-bold text-surface-900 text-sm">{attendee.name}</span>
                            {attendee.category === 'student' && attendee.usn_employee_id && (
                              <span className="text-[10px] text-surface-500 font-medium">
                                SRN: <span className="font-mono">{attendee.usn_employee_id.replace(/^SRN:\s*/i, '')}</span>
                              </span>
                            )}
                          </div>
                          {attendee.status === 'rejected' ? (
                            <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase bg-red-100 text-red-800 border border-red-300">
                              REJECTED (OUT OF RADIUS)
                            </span>
                          ) : (
                            <span
                              className={`px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase ${
                                attendee.status === 'present'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {attendee.status}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-xs text-surface-500">
                          <span>Role: {attendee.role}</span>
                          <span className={attendee.gps_status === 'Outside Radius' ? 'text-red-700 font-bold' : ''}>
                            GPS: {attendee.gps_status} {attendee.distance !== null ? `(${attendee.distance}m)` : ''}
                          </span>
                          <span className="col-span-2">
                            Logged: {attendee.check_in_time ? new Date(attendee.check_in_time).toLocaleTimeString('en-IN') : '—'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          ) : (
            /* Session creation panel */
            <div className="w-full flex justify-center">
              <Card 
                className="p-10 max-w-3xl lg:max-w-4xl w-full border border-surface-200/80 shadow-md shadow-surface-900/4 rounded-3xl bg-white hover:shadow-lg hover:shadow-surface-900/6 hover:border-surface-300 hover:-translate-y-0.5 hover:scale-[1.003] transition-all duration-300 ease-out" 
                padding="lg"
              >
                <div className="border-b border-surface-100 pb-5 mb-8">
                  <h3 className="text-xl font-bold text-surface-900 tracking-tight">Start Attendance Session</h3>
                  <p className="text-xs text-surface-500 mt-1.5">
                    Initialize a live geolocation-verified attendance check for volunteers and team leads on the project roster.
                  </p>
                </div>

                <div className="space-y-8 text-sm">
                  <div className="space-y-3">
                    <label className="text-xs font-semibold text-surface-700 uppercase tracking-wide">Attendance Type</label>
                    <div className="flex gap-8 mt-1.5">
                      <label className="flex items-center gap-2.5 cursor-pointer font-medium text-surface-850">
                        <input
                          type="radio"
                          name="session_type"
                          value="check_in"
                          checked={sessionType === 'check_in'}
                          onChange={() => setSessionType('check_in')}
                          className="accent-primary-600 w-4 h-4 cursor-pointer"
                        />
                        <span>Check-In</span>
                      </label>
                      <label className="flex items-center gap-2.5 cursor-pointer font-medium text-surface-850">
                        <input
                          type="radio"
                          name="session_type"
                          value="check_out"
                          checked={sessionType === 'check_out'}
                          onChange={() => setSessionType('check_out')}
                          className="accent-primary-600 w-4 h-4 cursor-pointer"
                        />
                        <span>Check-Out</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-2.5">
                      <label htmlFor="radius_select" className="text-xs font-semibold text-surface-700 uppercase tracking-wide">
                        Attendance Radius
                      </label>
                      <select
                        id="radius_select"
                        value={radius}
                        onChange={(e) => setRadius(parseInt(e.target.value))}
                        className="w-full px-4 py-2.5 rounded-xl border border-surface-300 bg-white text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 hover:border-surface-400 transition-all text-sm"
                      >
                        <option value={50}>50 meters</option>
                        <option value={100}>100 meters (Default)</option>
                        <option value={150}>150 meters</option>
                        <option value={200}>200 meters</option>
                      </select>
                    </div>

                    <div className="space-y-2.5">
                      <label htmlFor="duration_select" className="text-xs font-semibold text-surface-700 uppercase tracking-wide">
                        Session Expiry Duration
                      </label>
                      <select
                        id="duration_select"
                        value={duration}
                        onChange={(e) => setDuration(parseInt(e.target.value))}
                        className="w-full px-4 py-2.5 rounded-xl border border-surface-300 bg-white text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 hover:border-surface-400 transition-all text-sm"
                      >
                        <option value={5}>5 minutes</option>
                        <option value={10}>10 minutes</option>
                        <option value={15}>15 minutes (Default)</option>
                        <option value={20}>20 minutes</option>
                        <option value={30}>30 minutes</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-surface-50 border border-surface-150 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <span className="text-xs font-bold text-surface-800 flex items-center gap-1.5">
                        <MapPin size={15} className="text-primary-600" /> Geolocation Verification
                      </span>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        leftIcon={<Compass size={13} />} 
                        onClick={() => captureLocation(false)} 
                        isLoading={gpsLoading}
                        disabled={permissionState === 'denied'}
                        className="px-4 py-2.5 rounded-xl text-xs font-semibold border-surface-300 text-surface-700 hover:bg-slate-50 transition-all"
                      >
                        Capture Location
                      </Button>
                    </div>

                    {/* Permission Status Displays */}
                    {permissionState === 'checking' && (
                      <div className="flex items-center gap-2 text-xs text-surface-500 py-2">
                        <Spinner size="sm" />
                        <span>Checking browser location permission...</span>
                      </div>
                    )}

                    {permissionState === 'prompt' && !facultyCoords && (
                      <div className="bg-blue-50 border border-blue-150 rounded-xl p-4 space-y-3">
                        <div className="flex items-start gap-2.5 text-xs text-blue-800">
                          <Compass className="text-blue-600 shrink-0 mt-0.5" size={16} />
                          <div className="space-y-1">
                            <p className="font-bold">Location Permission Needed</p>
                            <p className="text-blue-700">Please grant location permission to verify your attendance zone before starting.</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => captureLocation(false)}
                          leftIcon={<Compass size={13} />}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-xs"
                        >
                          Enable Location Access
                        </Button>
                      </div>
                    )}

                    {permissionState === 'denied' && (
                      <div className="bg-red-50 border border-red-150 rounded-xl p-4 space-y-2.5">
                        <div className="flex items-start gap-2.5 text-xs text-red-800">
                          <AlertTriangle className="text-red-650 shrink-0 mt-0.5" size={16} />
                          <div className="space-y-1">
                            <p className="font-bold">Location Permission Denied</p>
                            <p className="text-red-700">Location access is blocked. To start attendance, please enable location permission in your settings:</p>
                          </div>
                        </div>
                        <ul className="list-disc pl-5 text-[11px] text-red-700 space-y-1.5 bg-white border border-red-100 rounded-lg p-3">
                          <li><strong>iOS / Safari:</strong> Open iOS Settings App &gt; Safari &gt; Location &gt; change setting to <strong>Allow</strong>.</li>
                          <li><strong>Android / Chrome:</strong> Tap the padlock icon in the browser address bar &gt; Permission &gt; enable <strong>Location</strong>.</li>
                          <li><strong>Desktop / Edge / Chrome:</strong> Click site settings in the URL bar and allow <strong>Location</strong>.</li>
                        </ul>
                        <p className="text-[10px] text-red-600 italic">After updating your settings, tap "Capture Location" above to verify.</p>
                      </div>
                    )}

                    {/* Coordinates captured state */}
                    {facultyCoords ? (
                      <div className="text-xs text-surface-600 bg-white border border-surface-100 rounded-xl p-3.5 flex items-center justify-between">
                        <span className="flex items-center gap-1 text-emerald-700 font-medium">
                          <CheckCircle size={14} /> Coordinates Verified
                        </span>
                        <span className="font-mono font-bold text-surface-900 bg-surface-50 px-2.5 py-1 rounded border border-surface-100 text-xs">
                          {facultyCoords.latitude.toFixed(6)}, {facultyCoords.longitude.toFixed(6)}
                        </span>
                      </div>
                    ) : (
                      permissionState !== 'prompt' && permissionState !== 'denied' && permissionState !== 'checking' && (
                        <div className="text-xs text-surface-500 flex items-center gap-2">
                          <AlertCircle size={15} className="text-amber-500 shrink-0" />
                          <span>Please capture your current GPS location to start the attendance session.</span>
                        </div>
                      )
                    )}

                    {gpsError && permissionState !== 'denied' && (
                      <div className="text-xs text-red-650 bg-red-50 border border-red-100 rounded-xl p-3 flex items-center gap-2">
                        <AlertCircle size={15} className="text-red-650 shrink-0" />
                        <span>{gpsError}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-8 border-t border-surface-100 mt-8">
                    <Button 
                      size="md" 
                      className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition-all hover:scale-[1.005]" 
                      leftIcon={<Play size={16} />} 
                      disabled={!facultyCoords} 
                      onClick={handleStartSession}
                    >
                      Start Attendance Session
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      {/* ─── VIEW 2: HISTORICAL SESSIONS WORKSPACE ─── */}
      {viewMode === 'history' && (
        <>
          {selectedSession ? (
            /* Open reusable Session Summary card panel */
            <AttendanceSummary
              sessionId={selectedSession.id}
              projectId={campId}
              projectName="Legal Aid Project"
              phase={selectedSession.phase}
              sessionType={selectedSession.session_type}
              startsAt={selectedSession.starts_at}
              expiresAt={selectedSession.expires_at}
              radiusMeters={selectedSession.radius_meters}
              facultyCoords={{
                latitude: Number(selectedSession.faculty_latitude),
                longitude: Number(selectedSession.faculty_longitude),
              }}
              onBack={() => handleSelectSession(null)}
            />
          ) : (
            /* List of completed historical sessions */
            <div className="w-full flex justify-center">
              <Card 
                className="p-8 max-w-3xl lg:max-w-4xl w-full border border-surface-200/80 shadow-md shadow-surface-900/4 rounded-3xl bg-white hover:shadow-lg hover:shadow-surface-900/6 hover:border-surface-300 hover:-translate-y-0.5 hover:scale-[1.003] transition-all duration-300 ease-out" 
                padding="lg"
              >
                <div className="border-b border-surface-100 pb-4 mb-6">
                  <h3 className="text-lg font-bold text-surface-900 tracking-tight">Attendance Session History</h3>
                  <p className="text-xs text-surface-500 mt-1">Review turnouts and records of all previously concluded attendance checks.</p>
                </div>

                {historyError && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs mb-6">
                    <AlertCircle size={13} className="flex-shrink-0" />
                    {historyError}
                  </div>
                )}

                {loadingHistory ? (
                  <div className="flex justify-center py-12">
                    <Spinner size="lg" />
                  </div>
                ) : completedSessions.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-surface-300 rounded-2xl bg-surface-50/20">
                    <History className="w-12 h-12 text-surface-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-surface-700">No session history found</p>
                    <p className="text-xs text-surface-500 mt-0.5">No attendance sessions have been completed yet for this project phase.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {[...completedSessions]
                      .sort((a, b) => {
                        // If there are exactly 2 completed sessions, sort by type so Check-In is on the left
                        if (completedSessions.length === 2) {
                          if (a.session_type !== b.session_type) {
                            return a.session_type === 'check_in' ? -1 : 1;
                          }
                        }
                        
                        const dateA = new Date(a.starts_at);
                        const dateB = new Date(b.starts_at);
                        
                        const dayA = new Date(dateA.getFullYear(), dateA.getMonth(), dateA.getDate()).getTime();
                        const dayB = new Date(dateB.getFullYear(), dateB.getMonth(), dateB.getDate()).getTime();
                        
                        if (dayA !== dayB) {
                          return dayB - dayA; // newest day first
                        }
                        
                        // Same day: check_in always goes first (on the left)
                        if (a.session_type !== b.session_type) {
                          return a.session_type === 'check_in' ? -1 : 1;
                        }
                        
                        return dateA.getTime() - dateB.getTime();
                      })
                      .map((session) => {
                        const dateStr = formatDate(session.starts_at);
                        const timeStr = new Date(session.starts_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                        const percent = session.total_roster > 0 ? Math.round((session.present_count / session.total_roster) * 100) : 0;
                        
                        // Determine status: Closed (Completed) vs Open-and-Expired (Expired)
                        const isConcluded = session.status === 'closed';

                        return (
                          <Card
                            key={session.id}
                            hover={true}
                            onClick={() => handleSelectSession(session)}
                            className="p-6 min-h-[230px] flex flex-col justify-between cursor-pointer bg-white border border-surface-200 shadow-sm shadow-surface-900/4 rounded-2xl hover:shadow-md hover:border-surface-300 hover:-translate-y-0.5 hover:scale-[1.002] transition-all duration-300 ease-out relative overflow-hidden"
                          >
                            {/* Upper row: Badges and Status */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-surface-100 text-surface-650 uppercase tracking-wide">
                                  {session.phase === 'survey' ? 'Survey Phase' : 'Camp Phase'}
                                </span>
                                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-primary-50 text-primary-700 uppercase tracking-wide">
                                  {session.session_type === 'check_in' ? 'Check-In' : 'Check-Out'}
                                </span>
                              </div>

                              {/* Status Badge (Completed / Expired) */}
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                  isConcluded
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-250'
                                }`}
                              >
                                {isConcluded ? 'Completed' : 'Expired'}
                              </span>
                            </div>

                            {/* Session Title */}
                            <div className="mt-2.5">
                              <h4 className="font-extrabold text-surface-900 text-base leading-snug">
                                {session.phase === 'survey' ? 'Survey' : 'Camp'} {session.session_type === 'check_in' ? 'Check-In' : 'Check-Out'}
                              </h4>
                            </div>

                            <div className="flex-1" />

                            {/* Mid Row: Date and Time */}
                            <div className="grid grid-cols-2 gap-2 text-xs text-surface-550 py-2.5 border-t border-b border-surface-100/80 my-2">
                              <div className="flex items-center gap-1.5">
                                <Calendar size={13} className="text-surface-400" />
                                <span>{dateStr}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Clock size={13} className="text-surface-400" />
                                <span>{timeStr}</span>
                              </div>
                            </div>

                            {/* Footer Row: Turnout Stats and Action */}
                            <div className="flex items-center justify-between gap-2 pt-1">
                              <div className="space-y-0.5">
                                <span className="text-[9px] text-surface-400 block uppercase tracking-wider">Attendance turnout</span>
                                <span className="text-xs font-bold text-surface-850">
                                  {session.present_count} / {session.total_roster} Present ({percent}%)
                                </span>
                              </div>
                              <span className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1">
                                View Summary <ArrowRight size={12} />
                              </span>
                            </div>
                          </Card>
                        );
                      })}
                  </div>
                )}
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
