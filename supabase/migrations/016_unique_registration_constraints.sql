-- ================================================================
-- Migration 016: Unique Registration Constraints & Unified Trigger
-- Legal Aid Camp Documentation Platform
-- ================================================================

-- 1. Add UNIQUE constraint to public.persons(email)
-- This prevents duplicate registrations across all categories.
ALTER TABLE public.persons DROP CONSTRAINT IF EXISTS persons_email_key;
ALTER TABLE public.persons ADD CONSTRAINT persons_email_key UNIQUE (email);

-- 2. Create UNIQUE index for Student USN/SRN
-- Ensures SRN uniqueness is only enforced for student volunteers.
DROP INDEX IF EXISTS public.idx_persons_unique_usn_student;
CREATE UNIQUE INDEX idx_persons_unique_usn_student 
ON public.persons (usn_employee_id) 
WHERE (category = 'student' AND usn_employee_id IS NOT NULL AND usn_employee_id != '');

-- 3. Update the handle_new_user() trigger function to support Faculty signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  new_person_id uuid;
  assigned_role_name text;
  resolved_role_id uuid;
  user_category text;
BEGIN
  -- Security assertion: only run when called by the auth.users trigger
  IF TG_OP IS NULL OR TG_OP != 'INSERT' OR TG_TABLE_SCHEMA != 'auth' OR TG_TABLE_NAME != 'users' THEN
    RAISE EXCEPTION 'This function is restricted to insert trigger execution on auth.users.';
  END IF;

  user_category := COALESCE(new.raw_user_meta_data->>'category', 'student');

  -- A. Insert into public.persons table
  INSERT INTO public.persons (
    id,
    full_name,
    category,
    email,
    phone,
    usn_employee_id,
    department,
    semester,
    designation,
    registration_status
  ) VALUES (
    gen_random_uuid(),
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    user_category,
    new.email,
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'usn_employee_id',
    new.raw_user_meta_data->>'department',
    CASE WHEN user_category = 'faculty' THEN NULL ELSE new.raw_user_meta_data->>'semester' END,
    CASE WHEN user_category = 'faculty' THEN new.raw_user_meta_data->>'designation' ELSE NULL END,
    'pending' -- Starts as pending coordinator verification
  )
  RETURNING id INTO new_person_id;

  -- B. Resolve the system role based on category
  IF user_category = 'faculty' THEN
    assigned_role_name := 'faculty';
  ELSE
    assigned_role_name := 'volunteer';
  END IF;

  SELECT id INTO resolved_role_id
  FROM public.roles
  WHERE name = assigned_role_name
  LIMIT 1;

  IF resolved_role_id IS NULL THEN
    RAISE EXCEPTION 'Role % not found in public.roles.', assigned_role_name;
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
    resolved_role_id,
    false -- User is inactive until approved by Coordinator
  );

  RETURN new;
END;
$$;
