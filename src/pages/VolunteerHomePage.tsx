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
import { supabase } from '@/services/supabase';
import { getProjectLifecycleState } from '@/utils/projectLifecycle';

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
  const [surveyCount, setSurveyCount] = useState<number>(0);

  useEffect(() => {
    if (!project?.id || !userId) return;
    supabase
      .from('surveys')
      .select('id', { count: 'exact', head: true })
      .eq('camp_id', project.id)
      .eq('submitted_by', userId)
      .then(({ count, error }) => {
        if (!error && count !== null) {
          setSurveyCount(count);
        }
      });
  }, [project?.id, userId]);

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
      const queryParams = new URLSearchParams(window.location.search);
      const sessionIdFromUrl = queryParams.get('session_id');

      let active: AttendanceSession | null = null;

      if (sessionIdFromUrl) {
        // Fetch specific session by ID (even if expired/closed, so we can display it as expired)
        const { data, error } = await supabase
          .from('attendance_sessions')
          .select('*')
          .eq('id', sessionIdFromUrl)
          .single();

        if (!error && data) {
          active = data as AttendanceSession;
        }
      }

      // If no session found in URL, poll normal active sessions
      if (!active) {
        const [surveySessions, campSessions] = await Promise.all([
          fetchActiveSessions(project.id, 'survey'),
          fetchActiveSessions(project.id, 'camp'),
        ]);
        active = surveySessions[0] || campSessions[0] || null;
      }

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
        // Do NOT nullify activeSession here, let the UI render the expired state!
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
    
    // Safety check for expired session
    const isExpired = new Date(activeSession.expires_at) <= new Date();
    if (isExpired) {
      setAttendanceError('Attendance session has already expired.');
      return;
    }

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

  /* ─── Derive lifecycle phase state ─── */
  const lifecycle = getProjectLifecycleState(project);
  const { state: lifecycleState, isSurveyActive, isCampActive } = lifecycle;

  /* ─── Phase-based access states ─── */
  // Volunteer has no access before survey phase or after camp phase
  const isBeforePhase = lifecycleState === 'draft' || lifecycleState === 'survey_scheduled';
  const isBetweenPhases = lifecycleState === 'between_phases';
  const isCompleted = lifecycleState === 'completed';
  // Archived DB status always closes access
  const isArchived = project.status === PROJECT_STATUS.ARCHIVED;

  /* ─── 1. NO ACCESS — Before Survey Phase ─── */
  if (isBeforePhase || (!isSurveyActive && !isCampActive && !isBetweenPhases && !isCompleted && !isArchived)) {
    const surveyDateStr = project.report_settings?.survey_date
      ? new Date(`${project.report_settings.survey_date}T${project.report_settings?.survey_start_time || '00:00'}`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : null;
    return (
      <div className="space-y-6 w-full max-w-2xl mx-auto py-6">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-600/20 text-center space-y-3">
          <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider">
            Survey Phase Scheduled
          </span>
          <h2 className="text-xl font-bold">{project.camp_name}</h2>
          {surveyDateStr && (
            <div className="flex items-center justify-center gap-2 text-blue-100 text-sm">
              <Calendar size={16} />
              <span>Survey on {surveyDateStr}</span>
            </div>
          )}
          <div className="flex items-center justify-center gap-1.5 text-blue-200 text-xs">
            <MapPin size={14} />
            <span>{project.village_name}, {project.district}</span>
          </div>
        </div>
        <Card>
          <div className="text-center py-6 space-y-2">
            <p className="text-sm font-semibold text-surface-800">Survey Access Opens at Phase Start</p>
            <p className="text-xs text-surface-500">
              Survey forms and documentation will activate automatically when the survey phase begins.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  /* ─── 2. NO ACCESS — Between Phases ─── */
  if (isBetweenPhases) {
    const campDateStr = project.camp_date
      ? new Date(`${project.camp_date}T${project.start_time || '00:00'}`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : null;
    return (
      <div className="space-y-6 w-full max-w-2xl mx-auto py-6">
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg shadow-amber-500/20 text-center space-y-3">
          <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider">
            Survey Phase Completed
          </span>
          <h2 className="text-xl font-bold">{project.camp_name}</h2>
          {campDateStr && (
            <div className="flex items-center justify-center gap-2 text-amber-100 text-sm">
              <Calendar size={16} />
              <span>Camp Phase on {campDateStr}</span>
            </div>
          )}
          <div className="flex items-center justify-center gap-1.5 text-amber-200 text-xs">
            <MapPin size={14} />
            <span>{project.village_name}, {project.district}</span>
          </div>
        </div>
        <Card>
          <div className="text-center py-6 space-y-2">
            <p className="text-sm font-semibold text-surface-800">Camp Phase Access Opens Soon</p>
            <p className="text-xs text-surface-500">
              The survey phase has concluded. Camp documentation and photo capture will activate when the camp phase begins.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  /* ─── 3. NO ACCESS — After Camp Phase / Archived ─── */
  if (isCompleted || isArchived) {
    return (
      <div className="space-y-6 w-full max-w-2xl mx-auto py-6">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-lg shadow-emerald-600/20 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-white/20 mx-auto flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-white" />
          </div>
          <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider">
            Project Completed
          </span>
          <h2 className="text-xl font-bold">{project.camp_name}</h2>
          <p className="text-xs text-emerald-100">
            Thank you for your active participation in documenting this project.
          </p>
        </div>
        <Card>
          <div className="text-center py-4 space-y-3">
            <p className="text-sm font-semibold text-surface-800">Participation Summary</p>
            <div className="flex flex-col gap-2 max-w-xs mx-auto text-left text-xs bg-surface-50 p-4 rounded-xl border border-surface-200">
              <div className="flex justify-between items-center">
                <span className="text-surface-500 font-medium">Survey Forms Submitted:</span>
                <span className="font-bold text-primary-600">{surveyCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-surface-500 font-medium">Documentation Photos Submitted:</span>
                <span className="font-bold text-emerald-600">{photos.length}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const activityPhotoCount = photos.filter(
    (p) => p.activity_id === selectedActivity?.id
  ).length;
  const maxPhotos = project.report_settings?.max_photos_per_activity ?? APP_CONFIG.DEFAULT_MAX_PHOTOS_PER_ACTIVITY;
  const atLimit = activityPhotoCount >= maxPhotos;

  const isSessionExpired = activeSession ? new Date(activeSession.expires_at) <= new Date() : false;

  return (
    <div className="space-y-6 sm:space-y-8 w-full max-w-2xl mx-auto px-2 pb-6">
      {/* ── Active Project Block ── */}
      <div className="space-y-2">
        <h3 className="text-[10px] font-extrabold text-surface-400 uppercase tracking-widest px-1">Active Project Assignment</h3>
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-4 text-white shadow-md shadow-primary-600/20 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-primary-200">
              {isSurveyActive ? 'Survey Phase Active' : 'Camp Phase Active'}
            </span>
            <h2 className="text-base font-bold leading-tight mt-0.5">{project.camp_name}</h2>
            <p className="text-xs text-primary-200 mt-0.5">{project.village_name}, {project.district}</p>
          </div>
        </div>
      </div>

      {/* ── Attendance Panel Block ── */}
      {activeSession && (
        <div className="space-y-2">
          <h3 className="text-[10px] font-extrabold text-surface-400 uppercase tracking-widest px-1">Attendance Verification</h3>
          <Card className={`p-4 border-l-4 space-y-3 ${isSessionExpired ? 'border-l-red-500 bg-red-50/10' : 'border-l-primary-500 bg-primary-50/20'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isSessionExpired ? 'bg-red-500' : 'bg-primary-600 animate-ping'}`} />
                <div>
                  <h3 className="text-xs font-bold text-surface-900 leading-tight">
                    {activeSession.phase === 'survey' ? 'Survey Phase' : 'Camp Phase'} Attendance {isSessionExpired ? 'Expired' : 'Open'}
                  </h3>
                  <p className="text-[10px] text-surface-500 mt-0.5">
                    {activeSession.session_type === 'check_in' ? 'Check-In' : 'Check-Out'} {isSessionExpired ? 'has closed.' : 'is open.'}
                  </p>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${isSessionExpired ? 'text-red-700 bg-red-50 border-red-100' : 'text-amber-700 bg-amber-50 border-amber-100'}`}>
                <Clock size={10} />
                {isSessionExpired ? 'Expired' : timeLeft}
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

            {isSessionExpired && !myRecord && (
              <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-150 rounded-xl text-red-800 text-xs font-medium">
                <AlertCircle size={14} className="text-red-600 flex-shrink-0 mt-0.5" />
                <span>This attendance session has ended. Late submissions are not accepted.</span>
              </div>
            )}

            {/* Action Row */}
            {!myRecord ? (
              <Button
                size="sm"
                className="w-full"
                isLoading={markingLocation}
                disabled={isSessionExpired}
                onClick={handleMarkAttendance}
              >
                {isSessionExpired ? 'Attendance Session Expired' : 'Mark Attendance'}
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
        </div>
      )}

      {/* ── Activity Selector Block ── */}
      <div className="space-y-2">
        <h3 className="text-[10px] font-extrabold text-surface-400 uppercase tracking-widest px-1">Select Active Activity</h3>
        <Card className="p-3 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1">
              <ActivitySelector
                campId={project.id}
                selectedActivityId={selectedActivity?.id ?? null}
                onSelect={setSelectedActivity}
                phase={isSurveyActive ? 'survey' : 'camp'}
                disabled={isSurveyActive}
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
      </div>

      {/* ── Photo Capture Block ── */}
      <div className="space-y-2">
        <h3 className="text-[10px] font-extrabold text-surface-400 uppercase tracking-widest px-1">Documentation Photo Capture</h3>
        <div>
          {!selectedActivity ? (
            <div className="w-full rounded-2xl border-2 border-dashed border-surface-300 bg-surface-100 flex flex-col items-center justify-center gap-1.5 py-6 px-4 text-surface-400 select-none">
              <Camera className="w-8 h-8 opacity-60 text-surface-400" />
              <span className="text-sm font-bold uppercase tracking-wider text-surface-500">CAMERA</span>
              <span className="text-xs text-surface-400">Select Activity First</span>
            </div>
          ) : (
            <button
              onClick={() => navigate(ROUTES.VOLUNTEER_CAPTURE, { state: { selectedActivity } })}
              disabled={atLimit}
              className="w-full flex flex-col items-center justify-center gap-3 py-6 px-4 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-700 text-white font-bold text-base shadow-lg shadow-primary-600/30 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all hover:brightness-105 cursor-pointer"
            >
              <Camera className="w-8 h-8" />
              <span>
                {atLimit
                  ? `Limit Reached (${activityPhotoCount}/${maxPhotos})`
                  : 'OPEN CAMERA'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* ── Data Collection Block — Survey phase only ── */}
      {isSurveyActive && (
        <div className="space-y-2">
          <h3 className="text-[10px] font-extrabold text-surface-400 uppercase tracking-widest px-1">Data Collection</h3>
          <button
            onClick={() => navigate(ROUTES.VOLUNTEER_SURVEY)}
            className="w-full flex flex-col items-center justify-center gap-2 py-5 px-4 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-600 text-white font-bold text-base shadow-lg shadow-accent-600/20 active:scale-[0.98] transition-all hover:brightness-105 cursor-pointer"
          >
            <ClipboardList className="w-7 h-7" />
            <span>CONDUCT SURVEY</span>
          </button>
        </div>
      )}
    </div>
  );
}
