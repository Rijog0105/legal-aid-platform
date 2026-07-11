-- ================================================================
-- Migration 001: Roles, Users, Persons
-- Legal Aid Camp Documentation Platform
-- ================================================================

-- ─── 1. ROLES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default roles
INSERT INTO public.roles (name) VALUES
  ('admin'),
  ('faculty'),
  ('team_lead'),
  ('volunteer')
ON CONFLICT (name) DO NOTHING;

-- ─── 2. PERSONS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('faculty', 'student', 'external')),
  designation TEXT,
  organization TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_persons_category ON public.persons(category);
CREATE INDEX IF NOT EXISTS idx_persons_full_name ON public.persons(full_name);

-- ─── 3. USERS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL UNIQUE,
  role_id UUID NOT NULL REFERENCES public.roles(id),
  person_id UUID NOT NULL REFERENCES public.persons(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON public.users(role_id);

-- ─── 4. CAMPS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.camps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_name TEXT NOT NULL,
  description TEXT,
  camp_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  village_name TEXT NOT NULL,
  taluk TEXT NOT NULL,
  district TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  report_settings JSONB NOT NULL DEFAULT '{"include_budget": true, "include_survey_stats": true, "max_photos_per_activity": 4}',
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_camps_status ON public.camps(status);
CREATE INDEX IF NOT EXISTS idx_camps_created_by ON public.camps(created_by);

-- ─── 5. CAMP_PEOPLE ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.camp_people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id UUID NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES public.persons(id),
  camp_role TEXT NOT NULL CHECK (camp_role IN ('faculty_coordinator', 'guest', 'volunteer', 'team_lead')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(camp_id, person_id, camp_role)
);

CREATE INDEX IF NOT EXISTS idx_camp_people_camp_id ON public.camp_people(camp_id);
CREATE INDEX IF NOT EXISTS idx_camp_people_person_id ON public.camp_people(person_id);

-- ─── 6. ACTIVITIES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id UUID NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  activity_name TEXT NOT NULL,
  activity_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activities_camp_id ON public.activities(camp_id);

-- ─── 7. PHOTOS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id UUID NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.users(id),
  file_url TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_selected_for_report BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_photos_camp_id ON public.photos(camp_id);
CREATE INDEX IF NOT EXISTS idx_photos_activity_id ON public.photos(activity_id);
CREATE INDEX IF NOT EXISTS idx_photos_selected ON public.photos(is_selected_for_report) WHERE is_selected_for_report = true;

-- ─── 8. SURVEYS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id UUID NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  survey_reference_id TEXT NOT NULL,
  submitted_by UUID NOT NULL REFERENCES public.users(id),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_surveys_camp_id ON public.surveys(camp_id);

-- ─── 9. EXPENSES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id UUID NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  expense_type TEXT NOT NULL,
  unit_cost NUMERIC(10,2) NOT NULL,
  quantity INTEGER NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  remarks TEXT,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_camp_id ON public.expenses(camp_id);

-- ─── 10. NARRATIVE_SECTIONS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.narrative_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id UUID NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL CHECK (section_type IN ('synopsis', 'objectives', 'observations', 'recommendations', 'conclusion')),
  content TEXT NOT NULL DEFAULT '',
  updated_by UUID NOT NULL REFERENCES public.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(camp_id, section_type)
);

CREATE INDEX IF NOT EXISTS idx_narrative_sections_camp_id ON public.narrative_sections(camp_id);

-- ─── 11. REPORTS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id UUID NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  generated_by UUID NOT NULL REFERENCES public.users(id),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  pdf_url TEXT,
  docx_url TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'final'))
);

CREATE INDEX IF NOT EXISTS idx_reports_camp_id ON public.reports(camp_id);

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camp_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.narrative_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- ─── Helper function: get user's app role ────────────────────
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT r.name
  FROM public.users u
  JOIN public.roles r ON r.id = u.role_id
  WHERE u.auth_user_id = auth.uid()
  AND u.is_active = true
  LIMIT 1;
$$;

-- ─── Helper function: get app user ID ────────────────────────
CREATE OR REPLACE FUNCTION public.get_app_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  AND is_active = true
  LIMIT 1;
$$;

-- ─── ROLES: Everyone can read ────────────────────────────────
CREATE POLICY "roles_select" ON public.roles FOR SELECT USING (true);

-- ─── PERSONS: Authenticated can read, admin/faculty can write ─
CREATE POLICY "persons_select" ON public.persons FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "persons_insert" ON public.persons FOR INSERT
  TO authenticated WITH CHECK (
    public.get_user_role() IN ('admin', 'faculty')
  );

CREATE POLICY "persons_update" ON public.persons FOR UPDATE
  TO authenticated USING (
    public.get_user_role() IN ('admin', 'faculty')
  );

-- ─── USERS: User can read own, admin can read all ─────────────
CREATE POLICY "users_select_own" ON public.users FOR SELECT
  TO authenticated USING (
    auth_user_id = auth.uid()
    OR public.get_user_role() = 'admin'
  );

CREATE POLICY "users_select_for_lookup" ON public.users FOR SELECT
  TO authenticated USING (true);

-- ─── CAMPS: Faculty/Admin CRUD, others read assigned ──────────
CREATE POLICY "camps_select" ON public.camps FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "camps_insert" ON public.camps FOR INSERT
  TO authenticated WITH CHECK (
    public.get_user_role() IN ('admin', 'faculty')
  );

CREATE POLICY "camps_update" ON public.camps FOR UPDATE
  TO authenticated USING (
    public.get_user_role() IN ('admin', 'faculty')
  );

CREATE POLICY "camps_delete" ON public.camps FOR DELETE
  TO authenticated USING (
    public.get_user_role() = 'admin'
  );

-- ─── CAMP_PEOPLE ─────────────────────────────────────────────
CREATE POLICY "camp_people_select" ON public.camp_people FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "camp_people_insert" ON public.camp_people FOR INSERT
  TO authenticated WITH CHECK (
    public.get_user_role() IN ('admin', 'faculty')
  );

CREATE POLICY "camp_people_delete" ON public.camp_people FOR DELETE
  TO authenticated USING (
    public.get_user_role() IN ('admin', 'faculty')
  );

-- ─── ACTIVITIES ──────────────────────────────────────────────
CREATE POLICY "activities_select" ON public.activities FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "activities_insert" ON public.activities FOR INSERT
  TO authenticated WITH CHECK (
    public.get_user_role() IN ('admin', 'faculty')
  );

CREATE POLICY "activities_update" ON public.activities FOR UPDATE
  TO authenticated USING (
    public.get_user_role() IN ('admin', 'faculty', 'team_lead')
  );

CREATE POLICY "activities_delete" ON public.activities FOR DELETE
  TO authenticated USING (
    public.get_user_role() IN ('admin', 'faculty')
  );

-- ─── PHOTOS ─────────────────────────────────────────────────
CREATE POLICY "photos_select" ON public.photos FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "photos_insert" ON public.photos FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "photos_update" ON public.photos FOR UPDATE
  TO authenticated USING (
    public.get_user_role() IN ('admin', 'faculty')
    OR uploaded_by = public.get_app_user_id()
  );

-- ─── SURVEYS ────────────────────────────────────────────────
CREATE POLICY "surveys_select" ON public.surveys FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "surveys_insert" ON public.surveys FOR INSERT
  TO authenticated WITH CHECK (true);

-- ─── EXPENSES ───────────────────────────────────────────────
CREATE POLICY "expenses_select" ON public.expenses FOR SELECT
  TO authenticated USING (
    public.get_user_role() IN ('admin', 'faculty')
  );

CREATE POLICY "expenses_insert" ON public.expenses FOR INSERT
  TO authenticated WITH CHECK (
    public.get_user_role() IN ('admin', 'faculty')
  );

CREATE POLICY "expenses_update" ON public.expenses FOR UPDATE
  TO authenticated USING (
    public.get_user_role() IN ('admin', 'faculty')
  );

CREATE POLICY "expenses_delete" ON public.expenses FOR DELETE
  TO authenticated USING (
    public.get_user_role() IN ('admin', 'faculty')
  );

-- ─── NARRATIVE_SECTIONS ─────────────────────────────────────
CREATE POLICY "narratives_select" ON public.narrative_sections FOR SELECT
  TO authenticated USING (
    public.get_user_role() IN ('admin', 'faculty', 'team_lead')
  );

CREATE POLICY "narratives_insert" ON public.narrative_sections FOR INSERT
  TO authenticated WITH CHECK (
    public.get_user_role() IN ('admin', 'faculty')
  );

CREATE POLICY "narratives_update" ON public.narrative_sections FOR UPDATE
  TO authenticated USING (
    public.get_user_role() IN ('admin', 'faculty')
  );

-- ─── REPORTS ────────────────────────────────────────────────
CREATE POLICY "reports_select" ON public.reports FOR SELECT
  TO authenticated USING (
    public.get_user_role() IN ('admin', 'faculty')
  );

CREATE POLICY "reports_insert" ON public.reports FOR INSERT
  TO authenticated WITH CHECK (
    public.get_user_role() IN ('admin', 'faculty')
  );

CREATE POLICY "reports_update" ON public.reports FOR UPDATE
  TO authenticated USING (
    public.get_user_role() IN ('admin', 'faculty')
  );

-- ================================================================
-- STORAGE BUCKETS
-- ================================================================
-- Run these in the Supabase dashboard SQL editor or via Supabase CLI:
--
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('camp-photos', 'camp-photos', false);
--
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('camp-reports', 'camp-reports', false);
--
-- CREATE POLICY "auth_users_upload_photos"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (bucket_id = 'camp-photos');
--
-- CREATE POLICY "auth_users_read_photos"
-- ON storage.objects FOR SELECT
-- TO authenticated
-- USING (bucket_id = 'camp-photos');
--
-- CREATE POLICY "auth_users_upload_reports"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (bucket_id = 'camp-reports');
--
-- CREATE POLICY "auth_users_read_reports"
-- ON storage.objects FOR SELECT
-- TO authenticated
-- USING (bucket_id = 'camp-reports');
