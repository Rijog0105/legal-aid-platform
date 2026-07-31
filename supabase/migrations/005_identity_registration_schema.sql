-- ================================================================
-- Migration 005: Identity & Registration Module Schema Updates
-- Legal Aid Camp Documentation Platform
-- ================================================================
-- NOTE: This migration does NOT add auth_user_id to public.persons.
-- The existing architecture is: auth.users → users.auth_user_id → users.person_id → persons
-- auth_user_id belongs ONLY on public.users, which already has it from migration 001.
-- ================================================================

DO $$
BEGIN
  -- 1. Extend public.persons with identity/registration fields ONLY
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
      ALTER TABLE public.persons ADD COLUMN registration_status TEXT DEFAULT 'approved'
        CHECK (registration_status IN ('pending', 'approved', 'rejected'));
    END IF;
  END IF;
END $$;

-- Index for the new registration_status column
CREATE INDEX IF NOT EXISTS idx_persons_registration_status ON public.persons(registration_status);

-- ─── 2. RLS: Allow a newly registered user to INSERT their own persons record ───
-- After supabase.auth.signUp(), the user is briefly authenticated.
-- We allow them to INSERT a 'pending' persons record during this window.
DROP POLICY IF EXISTS "persons_self_register" ON public.persons;
CREATE POLICY "persons_self_register" ON public.persons FOR INSERT
  TO authenticated
  WITH CHECK (registration_status = 'pending');

-- ─── 3. RLS: Allow a newly registered user to INSERT their own users record ─────
-- The registering user has no existing row in public.users yet, so get_user_role()
-- returns NULL. We allow INSERT only where auth_user_id = auth.uid() and
-- is_active = false (pending approval). This is safe: the user can only create
-- a record for themselves, and is_active=false means no application access is granted.
DROP POLICY IF EXISTS "users_self_register" ON public.users;
CREATE POLICY "users_self_register" ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (
    auth_user_id = auth.uid()
    AND is_active = false
  );

-- ─── 4. RLS: Allow Faculty & Admin to INSERT into public.users (approval flow) ─
-- (covers approve path: insert if the users row doesn't exist yet, or update)
DROP POLICY IF EXISTS "users_insert" ON public.users;
CREATE POLICY "users_insert" ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role() IN ('admin', 'faculty')
  );

-- ─── 5. RLS: Allow Faculty & Admin to UPDATE public.users (approval & role sync) ─
DROP POLICY IF EXISTS "users_update" ON public.users;
CREATE POLICY "users_update" ON public.users FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role() IN ('admin', 'faculty')
  );
