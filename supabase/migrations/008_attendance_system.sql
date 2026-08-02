-- ================================================================
-- Migration 008: Attendance System and Notifications Schema
-- ================================================================

-- ─── 1. TABLES ───

-- Create attendance_sessions table
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id UUID NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  phase TEXT NOT NULL CHECK (phase IN ('survey', 'camp')),
  session_type TEXT NOT NULL CHECK (session_type IN ('check_in', 'check_out')),
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  faculty_latitude NUMERIC(9,6) NOT NULL,
  faculty_longitude NUMERIC(9,6) NOT NULL,
  faculty_gps_accuracy NUMERIC(6,2), -- GPS accuracy radius in meters
  radius_meters INTEGER NOT NULL DEFAULT 100 CHECK (radius_meters IN (50, 100, 150, 200)),
  duration_minutes INTEGER NOT NULL DEFAULT 15 CHECK (duration_minutes IN (5, 10, 15, 20, 30)),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create attendance_records table
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  camp_id UUID NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  phase TEXT NOT NULL CHECK (phase IN ('survey', 'camp')),
  record_type TEXT NOT NULL CHECK (record_type IN ('check_in', 'check_out')),
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  distance_meters NUMERIC(10,2),
  gps_accuracy NUMERIC(6,2), -- Volunteer GPS accuracy radius in meters
  device_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  server_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  device_platform TEXT NOT NULL DEFAULT 'web',
  browser TEXT,               -- Capture user-agent details for audit
  os TEXT,                    -- Capture user OS details for audit
  app_version TEXT,           -- Client app version
  status TEXT NOT NULL CHECK (status IN ('present', 'rejected', 'pending')),
  rejection_reason TEXT,
  sync_status TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ─── 2. INDEXES ───

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_camp_id ON public.attendance_sessions(camp_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_status ON public.attendance_sessions(status);

CREATE INDEX IF NOT EXISTS idx_attendance_records_session_id ON public.attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_user_id ON public.attendance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_camp_id ON public.attendance_records(camp_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);


-- ─── 3. ROW LEVEL SECURITY ───

ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;


-- ─── 4. RLS POLICIES (IDEMPOTENT) ───

-- attendance_sessions: SELECT
DROP POLICY IF EXISTS "attendance_sessions_select" ON public.attendance_sessions;
CREATE POLICY "attendance_sessions_select" ON public.attendance_sessions FOR SELECT
  TO authenticated USING (true);

-- attendance_sessions: INSERT
DROP POLICY IF EXISTS "attendance_sessions_insert" ON public.attendance_sessions;
CREATE POLICY "attendance_sessions_insert" ON public.attendance_sessions FOR INSERT
  TO authenticated WITH CHECK (public.get_user_role() IN ('admin', 'faculty'));

-- attendance_sessions: UPDATE
DROP POLICY IF EXISTS "attendance_sessions_update" ON public.attendance_sessions;
CREATE POLICY "attendance_sessions_update" ON public.attendance_sessions FOR UPDATE
  TO authenticated USING (public.get_user_role() IN ('admin', 'faculty'));

-- attendance_sessions: DELETE
DROP POLICY IF EXISTS "attendance_sessions_delete" ON public.attendance_sessions;
CREATE POLICY "attendance_sessions_delete" ON public.attendance_sessions FOR DELETE
  TO authenticated USING (public.get_user_role() IN ('admin', 'faculty'));


-- attendance_records: SELECT (Faculty can read all, Volunteers only their own)
DROP POLICY IF EXISTS "attendance_records_select" ON public.attendance_records;
CREATE POLICY "attendance_records_select" ON public.attendance_records FOR SELECT
  TO authenticated USING (
    public.get_user_role() IN ('admin', 'faculty')
    OR
    user_id = public.get_app_user_id()
  );

-- attendance_records: INSERT (Strictly volunteer marking their own attendance)
DROP POLICY IF EXISTS "attendance_records_insert" ON public.attendance_records;
CREATE POLICY "attendance_records_insert" ON public.attendance_records FOR INSERT
  TO authenticated WITH CHECK (
    user_id = public.get_app_user_id()
  );

-- attendance_records: UPDATE (Immutability enforced; no update permissions)
DROP POLICY IF EXISTS "attendance_records_update" ON public.attendance_records;

-- attendance_records: DELETE (Immutability enforced; no delete permissions)
DROP POLICY IF EXISTS "attendance_records_delete" ON public.attendance_records;


-- notifications: SELECT (Volunteers can only read their own notifications)
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT
  TO authenticated USING (user_id = public.get_app_user_id());

-- notifications: INSERT (Only Faculty/Admin can dispatch notifications)
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT
  TO authenticated WITH CHECK (public.get_user_role() IN ('admin', 'faculty'));

-- notifications: UPDATE (Volunteers can only update read/unread status on their own notifications)
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE
  TO authenticated USING (user_id = public.get_app_user_id()) WITH CHECK (user_id = public.get_app_user_id());

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.attendance_sessions
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.attendance_records
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.notifications
TO authenticated;