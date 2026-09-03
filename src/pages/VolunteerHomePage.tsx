import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useMyProjectAssignment } from '@/features/volunteer/hooks/useMyProjectAssignment';
import { useMyPhotos } from '@/features/volunteer/hooks/useMyPhotos';
import { ActivitySelector } from '@/features/volunteer/components/ActivitySelector';
import { PhotoCounter } from '@/features/volunteer/components/PhotoCounter';
import { Spinner } from '@/components/ui';
import {
  Camera,
  Images,
  MapPin,
  Calendar,
  ClipboardList,
  CheckCircle,
  Clock,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  Navigation,
} from 'lucide-react';
import { ROUTES, APP_CONFIG } from '@/constants';
import { useGeolocation } from '@/hooks/useGeolocation';
import type { Activity, AttendanceSession, AttendanceRecord } from '@/types';
import {
  fetchActiveSessions,
  submitAttendanceRecord,
  fetchMyAttendanceRecord,
} from '@/features/attendance/services/attendanceService';
import { supabase } from '@/services/supabase';
import { getProjectLifecycleState } from '@/utils/projectLifecycle';

export function VolunteerHomePage() {
  const { personId, userId } = useAuth();
  const navigate = useNavigate();

  const { project, isLoading: projectLoading, error: projectError } = useMyProjectAssignment(personId);
  const { photos } = useMyPhotos(project?.id ?? null, userId);
  const {
    isLoading: gpsLoading,
    permissionState,
    captureLocation,
  } = useGeolocation();

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

  const checkAttendance = useCallback(async () => {
    if (!project || !userId) return;
    try {
      const queryParams = new URLSearchParams(window.location.search);
      const sessionIdFromUrl = queryParams.get('session_id');

      let active: AttendanceSession | null = null;

      if (sessionIdFromUrl) {
        const { data, error } = await supabase
          .from('attendance_sessions')
          .select('*')
          .eq('id', sessionIdFromUrl)
          .single();

        if (!error && data) {
          active = data as AttendanceSession;
        }
      }

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
            setAttendanceSuccess('Attendance verified and recorded successfully!');
            setAttendanceError(null);
          } else {
            setAttendanceError(record.rejection_reason || 'Attendance not confirmed.');
            setAttendanceSuccess(null);
          }
        }
      } else {
        setMyRecord(null);
        setAttendanceSuccess(null);
        setAttendanceError(null);
      }
    } catch (err) {
      console.error('Error checking attendance sessions:', err);
    }
  }, [project, userId]);

  useEffect(() => {
    checkAttendance();
    const interval = setInterval(checkAttendance, 15000);
    return () => clearInterval(interval);
  }, [checkAttendance]);

  useEffect(() => {
    if (!activeSession) return;
    const updateCountdown = () => {
      const remainingMs = new Date(activeSession.expires_at).getTime() - Date.now();
      if (remainingMs <= 0) {
        setTimeLeft('Closed');
      } else {
        const mins = Math.floor(remainingMs / 60000);
        const secs = Math.floor((remainingMs % 60000) / 1000);
        setTimeLeft(`${mins}:${secs < 10 ? '0' : ''}${secs} left`);
      }
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const handleMarkAttendance = async () => {
    if (!activeSession || !userId || !personId || !project) return;
    setMarkingLocation(true);
    setAttendanceError(null);
    setAttendanceSuccess(null);

    try {
      const activeCoords = await captureLocation(true);
      if (!activeCoords) {
        setAttendanceError('Could not obtain GPS location. Please allow location permissions and try again.');
        return;
      }

      const result = await submitAttendanceRecord({
        session_id: activeSession.id,
        user_id: userId,
        camp_id: project.id,
        phase: activeSession.phase,
        record_type: activeSession.session_type,
        latitude: activeCoords.latitude,
        longitude: activeCoords.longitude,
        gps_accuracy: activeCoords.accuracy ?? undefined,
      });

      if (result.status === 'present') {
        setAttendanceSuccess('Attendance confirmed and verified within radius!');
      } else {
        setAttendanceError(result.rejection_reason || 'Attendance marked as flagged/rejected.');
      }
      await checkAttendance();
    } catch (err: unknown) {
      setAttendanceError(err instanceof Error ? err.message : 'Error submitting attendance.');
    } finally {
      setMarkingLocation(false);
    }
  };

  if (projectLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center max-w-sm mx-auto animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <MapPin size={24} />
        </div>
        <h2 className="text-base font-bold text-slate-900">No Active Assignment</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          {projectError ?? 'You are not assigned to an active project. Contact your Faculty Coordinator.'}
        </p>
      </div>
    );
  }

  const lifecycle = getProjectLifecycleState(project);
  const isSurveyActive = lifecycle.isSurveyActive;
  const isBetweenPhases = lifecycle.isBetweenPhases;
  const isCompleted = lifecycle.isCompleted;
  const isArchived = project.status === 'archived';

  /* ─── Between Phases Notice ─── */
  if (isBetweenPhases) {
    const campDateStr = project.camp_date
      ? new Date(`${project.camp_date}T${project.start_time || '00:00'}`).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : null;

    return (
      <div className="space-y-5 w-full max-w-lg mx-auto py-4 animate-fade-in">
        <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl text-center space-y-3">
          <span className="px-3 py-1 rounded-full bg-amber-500/20 text-[10px] font-bold uppercase tracking-wider text-amber-300 border border-amber-500/30">
            Survey Phase Concluded
          </span>
          <h2 className="text-xl font-bold tracking-tight">{project.camp_name}</h2>
          {campDateStr && (
            <div className="flex items-center justify-center gap-2 text-slate-300 text-xs">
              <Calendar size={14} className="text-amber-400" />
              <span>Camp Phase on {campDateStr}</span>
            </div>
          )}
          <div className="flex items-center justify-center gap-1.5 text-slate-400 text-xs">
            <MapPin size={14} className="text-emerald-400" />
            <span>{project.village_name}, {project.district}</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-2">
          <p className="text-sm font-bold text-slate-800">Camp Documentation Opens at Camp Phase</p>
          <p className="text-xs text-slate-500">
            The initial survey phase is complete. Activity photo capture will activate on the camp day.
          </p>
        </div>
      </div>
    );
  }

  /* ─── Completed Project ─── */
  if (isCompleted || isArchived) {
    return (
      <div className="space-y-5 w-full max-w-lg mx-auto py-4 animate-fade-in">
        <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 mx-auto flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-emerald-400" />
          </div>
          <span className="px-3 py-1 rounded-full bg-white/10 text-[10px] font-bold uppercase tracking-wider text-emerald-300 border border-white/10">
            Project Completed
          </span>
          <h2 className="text-xl font-bold tracking-tight">{project.camp_name}</h2>
          <p className="text-xs text-slate-300">
            Thank you for your active participation in this legal aid project.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 text-center">
          <h3 className="text-sm font-bold text-slate-900">Your Activity Contribution</h3>
          <div className="grid grid-cols-2 gap-3 text-left">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-500">Surveys Done</span>
              <p className="text-2xl font-black text-indigo-600 mt-1">{surveyCount}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-500">Photos Uploaded</span>
              <p className="text-2xl font-black text-emerald-600 mt-1">{photos.length}</p>
            </div>
          </div>
        </div>
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
    <div className="space-y-6 w-full max-w-lg mx-auto pb-12 animate-fade-in">
      {/* ── Active Project Banner ── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-5 text-white shadow-xl shadow-slate-900/10">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-[10px] font-bold text-indigo-300 border border-white/10 uppercase tracking-wider">
              <Sparkles size={11} className="text-amber-400" />
              {isSurveyActive ? 'Survey Phase Active' : 'Camp Phase Active'}
            </span>
            <h2 className="text-base sm:text-lg font-bold tracking-tight leading-tight">{project.camp_name}</h2>
            <div className="flex items-center gap-1 text-slate-300 text-xs">
              <MapPin size={12} className="text-emerald-400 shrink-0" />
              <span className="truncate">{project.village_name}, {project.district}</span>
            </div>
          </div>

          <button
            onClick={() => navigate(ROUTES.VOLUNTEER_SUBMISSIONS)}
            className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white flex flex-col items-center gap-1 text-[10px] font-bold transition-all cursor-pointer shrink-0"
            title="My Submissions"
          >
            <Images size={16} />
            <span>Gallery</span>
          </button>
        </div>
      </div>

      {/* ── Attendance Session Verification ── */}
      {activeSession && (
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${isSessionExpired ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
                <Clock size={18} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  {activeSession.phase === 'survey' ? 'Survey Phase' : 'Camp Phase'} Roll Call
                </h3>
                <p className="text-[11px] text-slate-500">
                  {activeSession.session_type === 'check_in' ? 'Arrival Check-In' : 'Departure Check-Out'}
                </p>
              </div>
            </div>

            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${isSessionExpired ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
              {isSessionExpired ? 'Closed' : timeLeft}
            </span>
          </div>

          {attendanceSuccess && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-medium">
              <CheckCircle size={15} className="text-emerald-600 shrink-0" />
              <span>{attendanceSuccess}</span>
            </div>
          )}

          {attendanceError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-xs font-medium">
              <AlertCircle size={15} className="text-red-600 shrink-0 mt-0.5" />
              <span>{attendanceError}</span>
            </div>
          )}

          {permissionState === 'denied' && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-[11px] text-red-800 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-red-600" /> GPS Access Required
              </p>
              <p>Please allow location access in your browser to verify attendance.</p>
            </div>
          )}

          {!myRecord ? (
            <button
              onClick={handleMarkAttendance}
              disabled={isSessionExpired || markingLocation || gpsLoading}
              className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {markingLocation || gpsLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Verifying Geolocation…</span>
                </>
              ) : isSessionExpired ? (
                <span>Session Expired</span>
              ) : (
                <>
                  <Navigation size={14} />
                  <span>Mark Attendance with GPS</span>
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <span className="text-slate-500 font-medium">Verification Status:</span>
              <span
                className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                  myRecord.status === 'present'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-red-100 text-red-800 border border-red-200'
                }`}
              >
                {myRecord.status}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Data Collection Block (Survey Phase) ── */}
      {isSurveyActive && (
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Household Survey</span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {surveyCount} Submissions
            </span>
          </div>

          <button
            onClick={() => navigate(ROUTES.VOLUNTEER_SURVEY)}
            className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-md shadow-emerald-500/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2.5"
          >
            <ClipboardList size={18} />
            <span>Conduct Survey Questionnaire</span>
          </button>
        </div>
      )}

      {/* ── Activity Selector & Photo Capture Block ── */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Activity Photo Capture</span>
          {selectedActivity && (
            <PhotoCounter count={activityPhotoCount} max={maxPhotos} />
          )}
        </div>

        <ActivitySelector
          project={project}
          campId={project.id}
          selectedActivityId={selectedActivity?.id ?? null}
          onSelect={setSelectedActivity}
          phase={isSurveyActive ? 'survey' : 'camp'}
          disabled={isSurveyActive}
        />

        {!selectedActivity ? (
          <div className="w-full rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-1.5 py-6 px-4 text-slate-400 select-none">
            <Camera size={24} className="text-slate-400" />
            <span className="text-xs font-bold text-slate-600">Select Target Activity</span>
            <span className="text-[11px] text-slate-400">Photos will be tagged with GPS coordinates</span>
          </div>
        ) : (
          <button
            onClick={() => navigate(ROUTES.VOLUNTEER_CAPTURE, { state: { selectedActivity } })}
            disabled={atLimit}
            className="w-full py-4 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold text-sm shadow-md shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2.5"
          >
            <Camera size={18} />
            <span>
              {atLimit ? `Limit Reached (${activityPhotoCount}/${maxPhotos})` : 'Open Camera to Document'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
