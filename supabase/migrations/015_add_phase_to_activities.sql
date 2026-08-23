-- Migration 015: Add phase column to activities table
-- Separates Survey Phase activities from Camp Phase activities.
-- All existing activities default to 'camp'; rows whose name contains
-- 'survey' (case-insensitive) are reclassified to 'survey'.

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS phase TEXT NOT NULL DEFAULT 'camp'
  CHECK (phase IN ('survey', 'camp'));

CREATE INDEX IF NOT EXISTS idx_activities_phase ON public.activities(phase);

-- Classify existing activities by name heuristic.
-- "Survey Activity" → survey; everything else → camp (already the default).
UPDATE public.activities
  SET phase = 'survey'
  WHERE LOWER(activity_name) LIKE '%survey%';
