-- ================================================================
-- Migration 010: Survey Engine Schema and Template Architecture
-- ================================================================

-- ─── 1. CREATE METADATA TEMPLATE TABLES ───

-- Create survey_templates table
CREATE TABLE IF NOT EXISTS public.survey_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  UNIQUE (title, version)
);

-- Create survey_sections table
CREATE TABLE IF NOT EXISTS public.survey_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.survey_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create survey_questions table
CREATE TABLE IF NOT EXISTS public.survey_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.survey_sections(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_code TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('text', 'textarea', 'number', 'radio', 'checkbox', 'select', 'date', 'phone', 'email', 'family_grid', 'document_survey', 'photo_proof')),
  is_required BOOLEAN NOT NULL DEFAULT false,
  validation_rules JSONB DEFAULT '{}'::jsonb,
  question_options JSONB DEFAULT '[]'::jsonb,
  conditional_logic JSONB DEFAULT '{}'::jsonb,
  display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (section_id, question_code)
);

-- ─── 2. ALTER EXISTING SURVEYS HEADER TABLE ───

-- Add geolocation validation, templates, and telemetry columns
ALTER TABLE public.surveys ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.survey_templates(id) ON DELETE SET NULL;
ALTER TABLE public.surveys ADD COLUMN IF NOT EXISTS gps_latitude NUMERIC(9,6);
ALTER TABLE public.surveys ADD COLUMN IF NOT EXISTS gps_longitude NUMERIC(9,6);
ALTER TABLE public.surveys ADD COLUMN IF NOT EXISTS gps_accuracy NUMERIC(6,2);
ALTER TABLE public.surveys ADD COLUMN IF NOT EXISTS proof_photo_url TEXT;
ALTER TABLE public.surveys ADD COLUMN IF NOT EXISTS device_telemetry JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.surveys ADD COLUMN IF NOT EXISTS sync_status TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'failed'));

-- Add unique constraint to survey_reference_id
ALTER TABLE public.surveys DROP CONSTRAINT IF EXISTS surveys_survey_reference_id_key;
ALTER TABLE public.surveys ADD CONSTRAINT surveys_survey_reference_id_key UNIQUE (survey_reference_id);

-- ─── 3. CREATE ANSWERS LINE ITEMS TABLE ───

CREATE TABLE IF NOT EXISTS public.survey_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.survey_questions(id) ON DELETE CASCADE,
  answer_value TEXT,
  answer_payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (survey_id, question_id)
);

-- ─── 4. INDEXES FOR PERFORMANCE ───

CREATE INDEX IF NOT EXISTS idx_survey_templates_active ON public.survey_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_survey_sections_template ON public.survey_sections(template_id);
CREATE INDEX IF NOT EXISTS idx_survey_questions_section ON public.survey_questions(section_id);
CREATE INDEX IF NOT EXISTS idx_survey_questions_code ON public.survey_questions(question_code);
CREATE INDEX IF NOT EXISTS idx_surveys_reference ON public.surveys(survey_reference_id);
CREATE INDEX IF NOT EXISTS idx_surveys_camp ON public.surveys(camp_id);
CREATE INDEX IF NOT EXISTS idx_survey_answers_survey ON public.survey_answers(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_answers_question ON public.survey_answers(question_id);

-- ─── 5. ENABLE ROW LEVEL SECURITY (RLS) ───

ALTER TABLE public.survey_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_answers ENABLE ROW LEVEL SECURITY;

-- ─── 6. RLS POLICIES (IDEMPOTENT) ───

-- Templates
DROP POLICY IF EXISTS "templates_select" ON public.survey_templates;
CREATE POLICY "templates_select" ON public.survey_templates FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "templates_write" ON public.survey_templates;
CREATE POLICY "templates_write" ON public.survey_templates FOR ALL TO authenticated USING (public.get_user_role() IN ('admin', 'faculty'));

-- Sections
DROP POLICY IF EXISTS "sections_select" ON public.survey_sections;
CREATE POLICY "sections_select" ON public.survey_sections FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "sections_write" ON public.survey_sections;
CREATE POLICY "sections_write" ON public.survey_sections FOR ALL TO authenticated USING (public.get_user_role() IN ('admin', 'faculty'));

-- Questions
DROP POLICY IF EXISTS "questions_select" ON public.survey_questions;
CREATE POLICY "questions_select" ON public.survey_questions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "questions_write" ON public.survey_questions;
CREATE POLICY "questions_write" ON public.survey_questions FOR ALL TO authenticated USING (public.get_user_role() IN ('admin', 'faculty'));

-- Answers
DROP POLICY IF EXISTS "answers_select" ON public.survey_answers;
CREATE POLICY "answers_select" ON public.survey_answers FOR SELECT TO authenticated USING (
  public.get_user_role() IN ('admin', 'faculty')
  OR
  survey_id IN (SELECT id FROM public.surveys WHERE submitted_by = public.get_app_user_id())
);

DROP POLICY IF EXISTS "answers_insert" ON public.survey_answers;
CREATE POLICY "answers_insert" ON public.survey_answers FOR INSERT TO authenticated WITH CHECK (
  survey_id IN (SELECT id FROM public.surveys WHERE submitted_by = public.get_app_user_id())
);

-- Grants
GRANT SELECT ON public.survey_templates TO authenticated;
GRANT SELECT ON public.survey_sections TO authenticated;
GRANT SELECT ON public.survey_questions TO authenticated;
GRANT SELECT, INSERT ON public.survey_answers TO authenticated;
