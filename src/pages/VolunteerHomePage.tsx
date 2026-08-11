import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useMyProjectAssignment } from '@/features/volunteer/hooks/useMyProjectAssignment';
import { useMyPhotos } from '@/features/volunteer/hooks/useMyPhotos';
import { ActivitySelector } from '@/features/volunteer/components/ActivitySelector';
import { PhotoCounter } from '@/features/volunteer/components/PhotoCounter';
import { Card, Spinner, Button } from '@/components/ui';
import { Camera, Images, MapPin, Calendar, ClipboardList, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { ROUTES, APP_CONFIG, PROJECT_STATUS } from '@/constants';
import type { Activity, AttendanceSession, AttendanceRecord } from '@/types';
import {
  fetchActiveSessions,
  submitAttendanceRecord,
  fetchMyAttendanceRecord,
} from '@/features/attendance/services/attendanceService';

/**
 * Volunteer Workspace Home Page
 * Implements the Volunteer Home workflow for Upcoming, Active, and Finished project states
 * with live geolocation-verified attendance marking check.
 */
export function VolunteerHomePage() {
  const { personId, userId } = useAuth();
  const navigate = useNavigate();

  const { project, isLoading: projectLoading, error: projectError } = useMyProjectAssignment(personId);
  const { photos } = useMyPhotos(project?.id ?? null, userId);

  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  // Attendance states
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null);
  const [myRecord, setMyRecord] = useState<AttendanceRecord | null>(null);
  const [markingLocation, setMarkingLocation] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [attendanceSuccess, setAttendanceSuccess] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');

  // Callback to check active sessions & my record status
  const checkAttendance = useCallback(async () => {
    if (!project || !userId) return;
    try {
      const [surveySessions, campSessions] = await Promise.all([
        fetchActiveSessions(project.id, 'survey'),
        fetchActiveSessions(project.id, 'camp'),
      ]);

      const active = surveySessions[0] || campSessions[0] || null;
      setActiveSession(active);

      if (active) {
        const record = await fetchMyAttendanceRecord(active.id, userId);
        setMyRecord(record);
        if (record) {
          if (record.status === 'present') {
            setAttendanceSuccess('Attendance verified and marked successfully!');
            setAttendanceError(null);
          } else {
            setAttendanceError(record.rejection_reason || 'Attendance rejected.');
            setAttendanceSuccess(null);
          }
        }
      } else {
        setMyRecord(null);
        setAttendanceError(null);
        setAttendanceSuccess(null);
      }
    } catch (err) {
      console.error('Failed to check attendance sessions:', err);
    }
  }, [project, userId]);

  useEffect(() => {
    if (!project || !userId) return;

    checkAttendance();
    const interval = setInterval(checkAttendance, 15000); // Poll every 15 seconds

    return () => clearInterval(interval);
  }, [project, userId, checkAttendance]);

  // Countdown timer logic
  useEffect(() => {
    if (!activeSession) return;

    const updateTimer = () => {
      const expiry = new Date(activeSession.expires_at).getTime();
      const now = new Date().getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        setActiveSession(null);
        setMyRecord(null);
        setAttendanceError(null);
        setAttendanceSuccess(null);
      } else {
        const min = Math.floor(diff / 60000);
        const sec = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${min}m ${sec}s remaining`);
      }
    };

    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);

    return () => clearInterval(timerInterval);
  }, [activeSession]);

  // GPS Mark Attendance Action
  const handleMarkAttendance = () => {
    if (!activeSession || !userId || !project) return;
    setMarkingLocation(true);
    setAttendanceError(null);
    setAttendanceSuccess(null);

    if (!navigator.geolocation) {
      setAttendanceError('Geolocation is not supported by your device.');
      setMarkingLocation(false);
      return;
    }

    const getBrowserAndOS = () => {
      const ua = navigator.userAgent;
      let browser = 'Unknown';
      let os = 'Unknown';

      if (ua.indexOf('Firefox') > -1) browser = 'Firefox';
      else if (ua.indexOf('Chrome') > -1) browser = 'Chrome';
      else if (ua.indexOf('Safari') > -1) browser = 'Safari';
      else if (ua.indexOf('Edge') > -1) browser = 'Edge';

      if (ua.indexOf('Windows') > -1) os = 'Windows';
      else if (ua.indexOf('Mac') > -1) os = 'macOS';
      else if (ua.indexOf('Linux') > -1) os = 'Linux';
      else if (ua.indexOf('Android') > -1) os = 'Android';
      else if (ua.indexOf('iPhone') > -1) os = 'iOS';

      return { browser, os };
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { browser, os } = getBrowserAndOS();
          const rec = await submitAttendanceRecord({
            session_id: activeSession.id,
            user_id: userId,
            camp_id: project.id,
            phase: activeSession.phase,
            record_type: activeSession.session_type,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            gps_accuracy: position.coords.accuracy ?? undefined,
            device_platform: 'web-mobile',
            browser,
            os,
            app_version: '1.0.0',
          });
          setMyRecord(rec);
          if (rec.status === 'present') {
            setAttendanceSuccess('Attendance verified and marked successfully!');
            setAttendanceError(null);
          } else {
            setAttendanceError(rec.rejection_reason || 'Attendance rejected.');
            setAttendanceSuccess(null);
          }
        } catch (err) {
          setAttendanceError(err instanceof Error ? err.message : 'Failed to mark attendance.');
        } finally {
          setMarkingLocation(false);
        }
      },
      (error) => {
        let msg = 'Failed to capture your GPS location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Please grant GPS location permissions to verify attendance.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location request timed out. Make sure GPS is enabled.';
        }
        setAttendanceError(msg);
        setMarkingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  /* ─── Loading ─── */
  if (projectLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  /* ─── Error ─── */
  if (projectError) {
    return (
      <Card>
        <p className="text-sm text-red-600 text-center py-6">{projectError}</p>
      </Card>
    );
  }

  /* ─── No assigned project ─── */
  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center">
          <MapPin className="w-8 h-8 text-surface-400" />
        </div>
        <p className="text-base font-semibold text-surface-800">No active project assigned</p>
        <p className="text-sm text-surface-500">
          You are not currently assigned to an active project.
          <br />
          Contact your faculty coordinator.
        </p>
      </div>
    );
  }

  const isUpcoming = project.status === PROJECT_STATUS.DRAFT;
  const isFinished = project.status === PROJECT_STATUS.COMPLETED || project.status === PROJECT_STATUS.ARCHIVED;
  const isActive = project.status === PROJECT_STATUS.ACTIVE;

  /* ─── 1. UPCOMING PROJECT STATE ─── */
  if (isUpcoming) {
    return (
      <div className="space-y-6 w-full max-w-2xl mx-auto py-6">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-600/20 text-center space-y-3">
          <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider">
            Upcoming Project
          </span>
          <h2 className="text-xl font-bold">{project.camp_name}</h2>
          <div className="flex items-center justify-center gap-2 text-blue-100 text-sm">
            <Calendar size={16} />
            <span>Scheduled on {new Date(project.camp_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-blue-200 text-xs">
            <MapPin size={14} />
            <span>{project.village_name}, {project.district}</span>
          </div>
        </div>

        <Card>
          <div className="text-center py-6 space-y-2">
            <p className="text-sm font-semibold text-surface-800">Documentation Unlocks at Project Start</p>
            <p className="text-xs text-surface-500">
              Camera photo capture and survey forms will automatically activate once faculty starts the project.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  /* ─── 2. FINISHED PROJECT STATE ─── */
  if (isFinished) {
    return (
      <div className="space-y-6 w-full max-w-2xl mx-auto py-6">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-lg shadow-emerald-600/20 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-white/20 mx-auto flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-white" />
          </div>
          <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider">
            Project Concluded
          </span>
          <h2 className="text-xl font-bold">{project.camp_name}</h2>
          <p className="text-xs text-emerald-100">
            Thank you for your active participation in documenting this project.
          </p>
        </div>

        <Card>
          <div className="text-center py-4 space-y-3">
            <p className="text-sm font-semibold text-surface-800">Participation Summary</p>
            <p className="text-xs text-surface-500">
              You submitted <span className="font-bold text-emerald-600">{photos.length}</span> documentation photos for this project.
            </p>
            <Button size="sm" variant="outline" onClick={() => navigate(ROUTES.VOLUNTEER_SUBMISSIONS)}>
              View Submission Gallery
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  /* ─── 3. ACTIVE PROJECT STATE (Primary Working Screen) ─── */
  const activityPhotoCount = photos.filter(
    (p) => p.activity_id === selectedActivity?.id
  ).length;
  const maxPhotos = project.report_settings?.max_photos_per_activity ?? APP_CONFIG.DEFAULT_MAX_PHOTOS_PER_ACTIVITY;
  const atLimit = activityPhotoCount >= maxPhotos;

  return (
    <div className="space-y-5 w-full max-w-2xl mx-auto px-1 sm:px-2">
      {/* ── Top Section (~10%): Active Project Header ── */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-4 text-white shadow-md shadow-primary-600/20 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-primary-200">Active Project</span>
          <h2 className="text-base font-bold leading-tight">{project.camp_name}</h2>
          <p className="text-xs text-primary-200 mt-0.5">{project.village_name}, {project.district}</p>
        </div>
      </div>

      {/* ── Attendance Notification Banner Panel ── */}
      {activeSession && (
        <Card className="p-4 border-l-4 border-l-primary-500 bg-primary-50/20 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary-600 animate-ping flex-shrink-0" />
              <div>
                <h3 className="text-xs font-bold text-surface-900 leading-tight">
                  {activeSession.phase === 'survey' ? 'Survey Phase' : 'Camp Phase'} Attendance Open
                </h3>
                <p className="text-[10px] text-surface-500 mt-0.5">
                  {activeSession.session_type === 'check_in' ? 'Check-In' : 'Check-Out'} is open.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 flex items-center gap-1">
              <Clock size={10} />
              {timeLeft}
            </span>
          </div>

          {attendanceSuccess && (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-150 rounded-xl text-emerald-800 text-xs">
              <CheckCircle size={14} className="text-emerald-600 flex-shrink-0" />
              <span>{attendanceSuccess}</span>
            </div>
          )}

          {attendanceError && (
            <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-150 rounded-xl text-red-800 text-xs">
              <AlertCircle size={14} className="text-red-600 flex-shrink-0 mt-0.5" />
              <span>{attendanceError}</span>
            </div>
          )}

          {/* Action Row */}
          {!myRecord ? (
            <Button
              size="sm"
              className="w-full"
              isLoading={markingLocation}
              onClick={handleMarkAttendance}
            >
              Mark Attendance
            </Button>
          ) : (
            <div className="flex items-center justify-between text-xs pt-1.5 border-t border-surface-200/50">
              <span className="text-surface-500">Your Status:</span>
              <span
                className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                  myRecord.status === 'present'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {myRecord.status}
              </span>
            </div>
          )}
        </Card>
      )}

      {/* ── Second Section (~20%): Activity Dropdown, Gallery Button & Photo Counter ── */}
      <Card className="p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1">
            <ActivitySelector
              campId={project.id}
              selectedActivityId={selectedActivity?.id ?? null}
              onSelect={setSelectedActivity}
            />
          </div>
          <button
            onClick={() => navigate(ROUTES.VOLUNTEER_SUBMISSIONS)}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-surface-100 text-surface-700 font-medium text-xs hover:bg-surface-200 active:scale-95 transition-all flex-shrink-0"
            title="Open Gallery"
          >
            <Images size={15} />
            <span>Gallery</span>
          </button>
        </div>

        {selectedActivity ? (
          <div className="flex items-center justify-between pt-1 border-t border-surface-100">
            <span className="text-xs text-surface-500 font-medium">Photos Used for {selectedActivity.activity_name}</span>
            <PhotoCounter count={activityPhotoCount} max={maxPhotos} />
          </div>
        ) : (
          <p className="text-xs text-surface-400 text-center italic pt-1">Select an activity to begin photo capture</p>
        )}
      </Card>

      {/* ── Main Area (~70%): Equal Split Action Buttons ── */}
      {/* ── Camera Area ── */}
      <div>
        {!selectedActivity ? (
          <div className="w-full min-h-[100px] rounded-2xl border-2 border-dashed border-surface-300 bg-surface-100 flex flex-col items-center justify-center gap-1.5 p-6 text-surface-400 select-none">
            <Camera className="w-8 h-8 opacity-60 text-surface-400" />
            <span className="text-sm font-bold uppercase tracking-wider text-surface-500">CAMERA</span>
            <span className="text-xs text-surface-400">Select Activity First</span>
          </div>
        ) : (
          <button
            onClick={() => navigate(ROUTES.VOLUNTEER_CAPTURE, { state: { selectedActivity } })}
            disabled={atLimit || !isActive}
            className="w-full min-h-[100px] flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-700 text-white font-bold text-lg shadow-lg shadow-primary-600/30 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all hover:brightness-105 cursor-pointer"
          >
            <Camera className="w-10 h-10" />
            <span>
              {atLimit
                ? `Limit Reached (${activityPhotoCount}/${maxPhotos})`
                : 'CAMERA'}
            </span>
          </button>
        )}
      </div>

      {/* ── Primary Action: Conduct Survey ── */}
      <button
        onClick={() => navigate(ROUTES.VOLUNTEER_SURVEY)}
        disabled={!isActive}
        className="w-full min-h-[90px] flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-600 text-white font-bold text-base shadow-lg shadow-accent-600/20 disabled:opacity-45 disabled:cursor-not-allowed active:scale-[0.98] transition-all hover:brightness-105 cursor-pointer"
      >
        <ClipboardList className="w-8 h-8" />
        <span>CONDUCT SURVEY</span>
      </button>
    </div>
  );
}
