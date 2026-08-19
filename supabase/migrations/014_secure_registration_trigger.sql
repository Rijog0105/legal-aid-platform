-- ================================================================
-- Migration 014: Secure Profile Synchronization Auth Trigger
-- Legal Aid Camp Documentation Platform
-- ================================================================

-- 1. Create the profile synchronization trigger function
-- SECURITY DEFINER allows this function to bypass RLS policies during execution.
-- SET search_path is set to 'public' explicitly to avoid search path hijacking.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  new_person_id uuid;
  volunteer_role_id uuid;
BEGIN
  -- Security assertion: only run when called by the auth.users trigger
  IF TG_OP IS NULL OR TG_OP != 'INSERT' OR TG_TABLE_SCHEMA != 'auth' OR TG_TABLE_NAME != 'users' THEN
    RAISE EXCEPTION 'This function is restricted to insert trigger execution on auth.users.';
  END IF;

  -- A. Insert into public.persons table
  -- Note: We explicitly hardcode the category to 'student' to prevent client role/category manipulation.
  INSERT INTO public.persons (
    id,
    full_name,
    category,
    email,
    phone,
    usn_employee_id,
    department,
    semester,
    registration_status
  ) VALUES (
    gen_random_uuid(),
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    'student',
    new.email,
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'usn_employee_id',
    new.raw_user_meta_data->>'department',
    new.raw_user_meta_data->>'semester',
    'pending' -- Starts as pending coordinator verification
  )
  RETURNING id INTO new_person_id;

  -- B. Resolve the system volunteer role
  SELECT id INTO volunteer_role_id
  FROM public.roles
  WHERE name = 'volunteer'
  LIMIT 1;

  IF volunteer_role_id IS NULL THEN
    RAISE EXCEPTION 'Default volunteer role not found in public.roles.';
  END IF;

  -- C. Insert into public.users table linking Auth user
  INSERT INTO public.users (
    id,
    auth_user_id,
    person_id,
    role_id,
    is_active
  ) VALUES (
    gen_random_uuid(),
    new.id,
    new_person_id,
    volunteer_role_id,
    false -- User is inactive until approved by Coordinator
  );

  RETURN new;
END;
$$;

-- 2. Bind the trigger to auth.users AFTER INSERT
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
