-- ================================================================
-- Migration 005: Identity & Registration Module Schema Updates
-- Legal Aid Camp Documentation Platform
-- ================================================================

DO $$
BEGIN
  -- 1. Extend public.persons table with usn_employee_id, department, semester, registration_status, auth_user_id
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'persons') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'persons' AND column_name = 'usn_employee_id') THEN
      ALTER TABLE public.persons ADD COLUMN usn_employee_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'persons' AND column_name = 'department') THEN
      ALTER TABLE public.persons ADD COLUMN department TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'persons' AND column_name = 'semester') THEN
      ALTER TABLE public.persons ADD COLUMN semester TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'persons' AND column_name = 'registration_status') THEN
      ALTER TABLE public.persons ADD COLUMN registration_status TEXT DEFAULT 'approved' CHECK (registration_status IN ('pending', 'approved', 'rejected'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'persons' AND column_name = 'auth_user_id') THEN
      ALTER TABLE public.persons ADD COLUMN auth_user_id UUID;
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_persons_registration_status ON public.persons(registration_status);
CREATE INDEX IF NOT EXISTS idx_persons_auth_user_id ON public.persons(auth_user_id);

-- 2. Allow self-registering pending inserts to public.persons
DROP POLICY IF EXISTS "persons_self_register" ON public.persons;
CREATE POLICY "persons_self_register" ON public.persons FOR INSERT
  WITH CHECK (registration_status = 'pending');

-- 3. Ensure public.users has INSERT and UPDATE policies for Faculty & Admin
DROP POLICY IF EXISTS "users_insert" ON public.users;
CREATE POLICY "users_insert" ON public.users FOR INSERT
  TO authenticated WITH CHECK (
    public.get_user_role() IN ('admin', 'faculty')
  );

DROP POLICY IF EXISTS "users_update" ON public.users FOR UPDATE
  TO authenticated USING (
    public.get_user_role() IN ('admin', 'faculty')
  );
