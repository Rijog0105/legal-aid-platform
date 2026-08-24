import { supabase } from '@/services/supabase';
import type { AttendanceSession, AttendanceRecord, Notification } from '@/types';

export interface CreateSessionPayload {
  camp_id: string;
  phase: 'survey' | 'camp';
  session_type: 'check_in' | 'check_out';
  created_by: string;
  faculty_latitude: number;
  faculty_longitude: number;
  radius_meters: number;
  duration_minutes: number;
  faculty_gps_accuracy?: number;
}

export interface SubmitAttendancePayload {
  session_id: string;
  user_id: string;
  camp_id: string;
  phase: 'survey' | 'camp';
  record_type: 'check_in' | 'check_out';
  latitude: number | null;
  longitude: number | null;
  device_platform?: string;
  gps_accuracy?: number;
  browser?: string;
  os?: string;
  app_version?: string;
}

/**
 * Calculate distance between two GPS coordinates in meters using the Haversine formula.
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // distance in meters
}

/**
 * Creates a new attendance session and dispatches in-app notifications
 * to all volunteers and team leads assigned to the project.
 */
export async function createAttendanceSession(payload: CreateSessionPayload): Promise<AttendanceSession> {
  const startsAt = new Date();
  const expiresAt = new Date(startsAt.getTime() + payload.duration_minutes * 60 * 1000);

  const { data, error } = await supabase
    .from('attendance_sessions')
    .insert([
      {
        camp_id: payload.camp_id,
        phase: payload.phase,
        session_type: payload.session_type,
        created_by: payload.created_by,
        faculty_latitude: payload.faculty_latitude,
        faculty_longitude: payload.faculty_longitude,
        faculty_gps_accuracy: payload.faculty_gps_accuracy || null,
        radius_meters: payload.radius_meters,
        duration_minutes: payload.duration_minutes,
        starts_at: startsAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        status: 'open',
      },
    ])
    .select()
    .single();

  if (error) throw new Error(error.message);

  const session = data as AttendanceSession;

  // Dispatch Notifications to all assigned volunteers/team leads
  try {
    const { data: roster } = await supabase
      .from('camp_people')
      .select('person_id, camp_role')
      .eq('camp_id', payload.camp_id)
      .or(`phase.eq.${payload.phase},phase.is.null`)
      .in('camp_role', ['volunteer', 'team_lead']);

    const personIds = roster?.map((r) => r.person_id) || [];
    if (personIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id')
        .in('person_id', personIds);

      const userIds = users?.map((u) => u.id) || [];
      if (userIds.length > 0) {
        const phaseLabel = payload.phase === 'survey' ? 'Survey' : 'Camp';
        const typeLabel = payload.session_type === 'check_in' ? 'Check-In' : 'Check-Out';
        const notificationPayloads = userIds.map((uId) => ({
          user_id: uId,
          title: `${phaseLabel} Phase Attendance Open`,
          message: `${typeLabel} attendance is open. You have ${payload.duration_minutes} minutes remaining to mark your attendance.`,
          link: `/volunteer?session_id=${session.id}`,
          is_read: false,
        }));

        await supabase.from('notifications').insert(notificationPayloads);
      }
    }
  } catch (notifErr) {
    console.error('Failed to dispatch attendance notifications:', notifErr);
  }

  return session;
}

/**
 * Manually closes an attendance session.
 */
export async function closeAttendanceSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('attendance_sessions')
    .update({ status: 'closed' })
    .eq('id', sessionId);

  if (error) throw new Error(error.message);
}

/**
 * Fetches any open attendance session for the project and phase.
 * Resolves session status on read if expires_at has passed.
 */
export async function fetchActiveSessions(campId: string, phase: 'survey' | 'camp'): Promise<AttendanceSession[]> {
  const { data, error } = await supabase
    .from('attendance_sessions')
    .select('*')
    .eq('camp_id', campId)
    .eq('phase', phase)
    .eq('status', 'open');

  if (error) throw new Error(error.message);

  const sessions = data as AttendanceSession[];
  const now = new Date();

  // Filter out and automatically close expired sessions in the background
  const activeSessions: AttendanceSession[] = [];
  for (const s of sessions) {
    if (new Date(s.expires_at) <= now) {
      // Expired. Close it in background.
      closeAttendanceSession(s.id).catch((err) =>
        console.error(`Failed to auto-close expired session ${s.id}:`, err)
      );
    } else {
      activeSessions.push(s);
    }
  }

  return activeSessions;
}

/**
 * Marks attendance for a volunteer/team lead. Calculates GPS check, device, and sync status.
 */
export async function submitAttendanceRecord(payload: SubmitAttendancePayload): Promise<AttendanceRecord> {
  // 1. Fetch session coordinates and configuration
  const { data: sessionData, error: sessionErr } = await supabase
    .from('attendance_sessions')
    .select('*')
    .eq('id', payload.session_id)
    .single();

  if (sessionErr || !sessionData) {
    throw new Error('Attendance session is not active or could not be found.');
  }

  const session = sessionData as AttendanceSession;

  if (session.status !== 'open' || new Date(session.expires_at) <= new Date()) {
    throw new Error('Attendance session has already expired or is closed.');
  }

  // 2. Validate GPS coordinates
  let distance: number | null = null;
  let status: 'present' | 'rejected' = 'present';
  let rejectionReason: string | null = null;

  if (payload.latitude !== null && payload.longitude !== null) {
    distance = calculateDistance(
      session.faculty_latitude,
      session.faculty_longitude,
      payload.latitude,
      payload.longitude
    );

    if (distance > session.radius_meters) {
      status = 'rejected';
      rejectionReason = 'You are outside the permitted attendance radius.';
    }
  } else {
    // If coordinates are missing, attendance is rejected (as coordinates are required for verification)
    status = 'rejected';
    rejectionReason = 'GPS coordinates are required to verify attendance.';
  }

  const { data, error } = await supabase
    .from('attendance_records')
    .insert([
      {
        session_id: payload.session_id,
        user_id: payload.user_id,
        camp_id: payload.camp_id,
        phase: payload.phase,
        record_type: payload.record_type,
        latitude: payload.latitude,
        longitude: payload.longitude,
        distance_meters: distance ? parseFloat(distance.toFixed(2)) : null,
        gps_accuracy: payload.gps_accuracy || null,
        device_timestamp: new Date().toISOString(),
        server_timestamp: new Date().toISOString(),
        device_platform: payload.device_platform || 'web',
        browser: payload.browser || null,
        os: payload.os || null,
        app_version: payload.app_version || null,
        status,
        rejection_reason: rejectionReason,
        sync_status: 'synced',
      },
    ])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('You have already submitted attendance for this session.');
    }
    throw new Error(error.message);
  }

  return data as AttendanceRecord;
}

export interface DashboardAttendee {
  user_id: string;
  name: string;
  role: string;
  check_in_time: string | null;
  distance: number | null;
  gps_status: 'Within Radius' | 'Outside Radius' | 'No GPS' | 'Pending';
  status: 'present' | 'rejected' | 'pending';
  rejection_reason: string | null;
  usn_employee_id?: string | null;
  category?: string | null;
}

/**
 * Fetches dashboard details mapping roster students with any submitted attendance record.
 */
export async function fetchSessionDashboardData(
  sessionId: string,
  projectId: string
): Promise<{
  attendees: DashboardAttendee[];
  stats: {
    present: number;
    pending: number;
    rejected: number;
    outside: number;
  };
}> {
  // 1. Fetch the session's phase
  const { data: sessionData, error: sessionErr } = await supabase
    .from('attendance_sessions')
    .select('phase')
    .eq('id', sessionId)
    .single();

  if (sessionErr || !sessionData) {
    throw new Error(sessionErr?.message || 'Session not found');
  }

  // 2. Fetch Roster
  const { data: roster, error: rosterErr } = await supabase
    .from('camp_people')
    .select(`
      camp_role,
      person_id,
      person:persons(id, full_name, usn_employee_id, category)
    `)
    .eq('camp_id', projectId)
    .or(`phase.eq.${sessionData.phase},phase.is.null`)
    .in('camp_role', ['volunteer', 'team_lead']);

  if (rosterErr) throw new Error(rosterErr.message);

  const validRoster = (roster || []) as any[];
  const personIds = validRoster.map((r) => r.person_id);

  if (personIds.length === 0) {
    return {
      attendees: [],
      stats: { present: 0, pending: 0, rejected: 0, outside: 0 },
    };
  }

  // 2. Fetch User IDs corresponding to person IDs
  const { data: users, error: usersErr } = await supabase
    .from('users')
    .select('id, person_id')
    .in('person_id', personIds);

  if (usersErr) throw new Error(usersErr.message);

  const userIdMap = new Map<string, string>(); // person_id -> user_id
  users?.forEach((u) => userIdMap.set(u.person_id, u.id));

  // 3. Fetch Records
  const { data: records, error: recordsErr } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('session_id', sessionId);

  if (recordsErr) throw new Error(recordsErr.message);

  const recordMap = new Map<string, AttendanceRecord>(); // user_id -> record
  records?.forEach((rec) => recordMap.set(rec.user_id, rec as AttendanceRecord));

  // 4. Map them together
  let present = 0;
  let pending = 0;
  let rejected = 0;
  let outside = 0;

  const attendees: DashboardAttendee[] = validRoster.map((r) => {
    const pId = r.person_id;
    const uId = userIdMap.get(pId) || '';
    const rec = uId ? recordMap.get(uId) : undefined;

    let check_in_time: string | null = null;
    let distance: number | null = null;
    let gps_status: 'Within Radius' | 'Outside Radius' | 'No GPS' | 'Pending' = 'Pending';
    let status: 'present' | 'rejected' | 'pending' = 'pending';
    let rejection_reason: string | null = null;

    if (rec) {
      check_in_time = rec.device_timestamp;
      distance = rec.distance_meters;
      status = rec.status;
      rejection_reason = rec.rejection_reason;

      if (rec.status === 'present') {
        gps_status = 'Within Radius';
        present++;
      } else {
        gps_status = rec.distance_meters !== null ? 'Outside Radius' : 'No GPS';
        rejected++;
        if (rec.distance_meters !== null) {
          outside++;
        }
      }
    } else {
      pending++;
    }

    const roleLabel = r.camp_role === 'team_lead' ? 'Team Lead' : 'Volunteer';

    return {
      user_id: uId,
      name: r.person?.full_name || 'Unknown',
      role: roleLabel,
      check_in_time,
      distance,
      gps_status,
      status,
      rejection_reason,
      usn_employee_id: r.person?.usn_employee_id,
      category: r.person?.category,
    };
  });

  return {
    attendees,
    stats: { present, pending, rejected, outside },
  };
}

/**
 * Fetch all notifications for a user.
 */
export async function fetchNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data as Notification[];
}

/**
 * Mark a notification as read.
 */
export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

/**
 * Checks if a user has already submitted an attendance record for a session.
 */
export async function fetchMyAttendanceRecord(sessionId: string, userId: string): Promise<AttendanceRecord | null> {
  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return null;
  return data as AttendanceRecord;
}

/**
 * Fetches all completed sessions (status = 'closed' OR expires_at <= now) for a project.
 */
export async function fetchCompletedSessions(campId: string, phase?: 'survey' | 'camp'): Promise<AttendanceSession[]> {
  let query = supabase
    .from('attendance_sessions')
    .select('*')
    .eq('camp_id', campId);

  if (phase) {
    query = query.eq('phase', phase);
  }

  const { data, error } = await query.order('starts_at', { ascending: false });
  if (error) throw new Error(error.message);

  const sessions = data as AttendanceSession[];
  const now = new Date();

  return sessions.filter((s) => s.status === 'closed' || new Date(s.expires_at) <= now);
}

/**
 * Fetches completed sessions with computed present count and total roster count.
 */
export async function fetchCompletedSessionsWithStats(
  campId: string,
  phase?: 'survey' | 'camp'
): Promise<Array<AttendanceSession & { present_count: number; total_roster: number }>> {
  const sessions = await fetchCompletedSessions(campId, phase);
  if (sessions.length === 0) return [];

  // Fetch roster counts for both phases separately (including legacy records)
  const [surveyRosterRes, campRosterRes] = await Promise.all([
    supabase
      .from('camp_people')
      .select('person_id', { count: 'exact', head: true })
      .eq('camp_id', campId)
      .or('phase.eq.survey,phase.is.null')
      .in('camp_role', ['volunteer', 'team_lead']),
    supabase
      .from('camp_people')
      .select('person_id', { count: 'exact', head: true })
      .eq('camp_id', campId)
      .or('phase.eq.camp,phase.is.null')
      .in('camp_role', ['volunteer', 'team_lead']),
  ]);

  const surveyRosterCount = surveyRosterRes.count || 0;
  const campRosterCount = campRosterRes.count || 0;

  // Fetch present count
  const sessionIds = sessions.map((s) => s.id);
  const { data: presentRecords } = await supabase
    .from('attendance_records')
    .select('session_id, status')
    .in('session_id', sessionIds)
    .eq('status', 'present');

  const statsMap = new Map<string, number>();
  presentRecords?.forEach((r) => {
    statsMap.set(r.session_id, (statsMap.get(r.session_id) || 0) + 1);
  });

  return sessions.map((s) => ({
    ...s,
    present_count: statsMap.get(s.id) || 0,
    total_roster: s.phase === 'survey' ? surveyRosterCount : campRosterCount,
  }));
}

/**
 * Fetches overview metrics for active and completed attendance sessions.
 */
export async function fetchProjectAttendanceOverview(campId: string): Promise<{
  surveyCheckIn: string;
  surveyCheckOut: string;
  campCheckIn: string;
  campCheckOut: string;
  overallPercentage: number | null;
  surveyPercentage: number | null;
  campPercentage: number | null;
}> {
  const sessions = await fetchCompletedSessions(campId);

  // Fetch roster counts for both phases separately (including legacy records)
  const [surveyRosterRes, campRosterRes] = await Promise.all([
    supabase
      .from('camp_people')
      .select('person_id')
      .eq('camp_id', campId)
      .or('phase.eq.survey,phase.is.null')
      .in('camp_role', ['volunteer', 'team_lead']),
    supabase
      .from('camp_people')
      .select('person_id')
      .eq('camp_id', campId)
      .or('phase.eq.camp,phase.is.null')
      .in('camp_role', ['volunteer', 'team_lead']),
  ]);

  const surveyRoster = surveyRosterRes.data?.length || 0;
  const campRoster = campRosterRes.data?.length || 0;

  let surveyCheckIn = 'Not Conducted';
  let surveyCheckOut = 'Not Conducted';
  let campCheckIn = 'Not Conducted';
  let campCheckOut = 'Not Conducted';

  let totalExpected = 0;
  let totalPresent = 0;

  const surveyCheckIns = sessions.filter((s) => s.phase === 'survey' && s.session_type === 'check_in');
  const surveyCheckOuts = sessions.filter((s) => s.phase === 'survey' && s.session_type === 'check_out');
  const campCheckIns = sessions.filter((s) => s.phase === 'camp' && s.session_type === 'check_in');
  const campCheckOuts = sessions.filter((s) => s.phase === 'camp' && s.session_type === 'check_out');

  const surveySessions = sessions.filter((s) => s.phase === 'survey');
  const campSessions = sessions.filter((s) => s.phase === 'camp');

  totalExpected = (surveySessions.length * surveyRoster) + (campSessions.length * campRoster);

  if (sessions.length > 0) {
    const { data: records } = await supabase
      .from('attendance_records')
      .select('session_id')
      .in('session_id', sessions.map((s) => s.id))
      .eq('status', 'present');
    totalPresent = records?.length || 0;
  }

  let surveyPercentage: number | null = null;
  let campPercentage: number | null = null;

  if (surveySessions.length > 0) {
    const { data: surveyRecords } = await supabase
      .from('attendance_records')
      .select('session_id')
      .in('session_id', surveySessions.map((s) => s.id))
      .eq('status', 'present');
    const surveyPresent = surveyRecords?.length || 0;
    const surveyExpected = surveySessions.length * surveyRoster;
    surveyPercentage = surveyExpected > 0 ? Math.round((surveyPresent / surveyExpected) * 100) : null;
  }

  if (campSessions.length > 0) {
    const { data: campRecords } = await supabase
      .from('attendance_records')
      .select('session_id')
      .in('session_id', campSessions.map((s) => s.id))
      .eq('status', 'present');
    const campPresent = campRecords?.length || 0;
    const campExpected = campSessions.length * campRoster;
    campPercentage = campExpected > 0 ? Math.round((campPresent / campExpected) * 100) : null;
  }

  const formatLatestSession = async (list: AttendanceSession[]) => {
    if (list.length === 0) return 'Not Conducted';
    const latest = list[0];
    const { count } = await supabase
      .from('attendance_records')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', latest.id)
      .eq('status', 'present');

    const activeRoster = latest.phase === 'survey' ? surveyRoster : campRoster;
    const dateStr = new Date(latest.starts_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    return `${count || 0}/${activeRoster} Present (${dateStr})`;
  };

  surveyCheckIn = await formatLatestSession(surveyCheckIns);
  surveyCheckOut = await formatLatestSession(surveyCheckOuts);
  campCheckIn = await formatLatestSession(campCheckIns);
  campCheckOut = await formatLatestSession(campCheckOuts);

  const overallPercentage = totalExpected > 0 ? Math.round((totalPresent / totalExpected) * 100) : null;

  return {
    surveyCheckIn,
    surveyCheckOut,
    campCheckIn,
    campCheckOut,
    overallPercentage,
    surveyPercentage,
    campPercentage,
  };
}


