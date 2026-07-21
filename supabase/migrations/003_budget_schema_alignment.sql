-- ================================================================
-- Migration 003: Budget Module Schema Alignment & RLS Updates
-- Legal Aid Camp Documentation Platform
-- ================================================================

DO $$
BEGIN
  -- 1. Ensure camps table has allocated_budget column
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'camps') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'camps' AND column_name = 'allocated_budget') THEN
      ALTER TABLE public.camps ADD COLUMN allocated_budget NUMERIC(10,2) DEFAULT 0.00;
    END IF;
  END IF;

  -- 2. Align expenses table columns to finalized budget schema
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expenses') THEN
    -- Rename expense_type to category if expense_type exists and category does not
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'expense_type') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'category') THEN
      ALTER TABLE public.expenses RENAME COLUMN expense_type TO category;
    END IF;

    -- Ensure category column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'category') THEN
      ALTER TABLE public.expenses ADD COLUMN category TEXT NOT NULL DEFAULT 'Miscellaneous';
    END IF;

    -- Ensure description column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'description') THEN
      ALTER TABLE public.expenses ADD COLUMN description TEXT;
    END IF;

    -- Ensure expense_date column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'expense_date') THEN
      ALTER TABLE public.expenses ADD COLUMN expense_date DATE NOT NULL DEFAULT CURRENT_DATE;
    END IF;

    -- Ensure receipt_url column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'receipt_url') THEN
      ALTER TABLE public.expenses ADD COLUMN receipt_url TEXT;
    END IF;
  END IF;
END $$;

-- 3. Update RLS policies on expenses to grant SELECT, INSERT, UPDATE, DELETE to team_lead
DROP POLICY IF EXISTS "expenses_select" ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert" ON public.expenses;
DROP POLICY IF EXISTS "expenses_update" ON public.expenses;
DROP POLICY IF EXISTS "expenses_delete" ON public.expenses;

CREATE POLICY "expenses_select" ON public.expenses FOR SELECT
  TO authenticated USING (
    public.get_user_role() IN ('admin', 'faculty', 'team_lead')
  );

CREATE POLICY "expenses_insert" ON public.expenses FOR INSERT
  TO authenticated WITH CHECK (
    public.get_user_role() IN ('admin', 'faculty', 'team_lead')
  );

CREATE POLICY "expenses_update" ON public.expenses FOR UPDATE
  TO authenticated USING (
    public.get_user_role() IN ('admin', 'faculty', 'team_lead')
  );

CREATE POLICY "expenses_delete" ON public.expenses FOR DELETE
  TO authenticated USING (
    public.get_user_role() IN ('admin', 'faculty', 'team_lead')
  );
