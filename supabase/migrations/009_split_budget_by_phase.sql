-- ================================================================
-- Migration 009: Split Budget by Phase (Survey vs Camp)
-- ================================================================

-- ─── 1. ALTER EXPENSES TABLE ───
-- Add phase column with default 'camp' for backward compatibility
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS phase TEXT NOT NULL DEFAULT 'camp';

-- Add check constraint for phase
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_phase_check;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_phase_check CHECK (phase IN ('survey', 'camp'));

-- Create index on phase for quick filtering
CREATE INDEX IF NOT EXISTS idx_expenses_phase ON public.expenses(phase);


-- ─── 2. ALTER CAMPS TABLE ───
-- Add separate allocated budget fields for survey and camp operational phases
ALTER TABLE public.camps ADD COLUMN IF NOT EXISTS allocated_budget_survey NUMERIC(10,2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.camps ADD COLUMN IF NOT EXISTS allocated_budget_camp NUMERIC(10,2) NOT NULL DEFAULT 0.00;

-- Migrate existing total allocated budget data to Camp Phase budget by default
UPDATE public.camps SET allocated_budget_camp = COALESCE(allocated_budget, 0.00)
WHERE allocated_budget IS NOT NULL AND allocated_budget_camp = 0.00;
