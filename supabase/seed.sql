-- ================================================================
-- SEED DATA
-- Legal Aid Camp Documentation Platform
-- ================================================================
-- Run AFTER the schema migration (001_complete_schema.sql).
-- This creates demo users for testing the full workflow.
--
-- IMPORTANT: Before running this, you must create auth users
-- in the Supabase Auth dashboard or via the API:
--
-- 1. faculty@lacp.test   / password: Faculty@123
-- 2. teamlead@lacp.test  / password: TeamLead@123
-- 3. volunteer1@lacp.test / password: Volunteer@123
-- 4. volunteer2@lacp.test / password: Volunteer@123
--
-- Then replace the auth_user_id values below with the actual UUIDs.
-- ================================================================

-- ─── Persons ─────────────────────────────────────────────────
INSERT INTO public.persons (id, full_name, category, designation, organization, phone, email) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Dr. Priya Sharma', 'faculty', 'Associate Professor', 'School of Law', '9876543210', 'priya.sharma@university.edu'),
  ('a1000000-0000-0000-0000-000000000002', 'Arjun Mehta', 'student', 'Team Lead', 'School of Law', '9876543211', 'arjun.mehta@student.edu'),
  ('a1000000-0000-0000-0000-000000000003', 'Sneha Patel', 'student', 'Volunteer', 'School of Law', '9876543212', 'sneha.patel@student.edu'),
  ('a1000000-0000-0000-0000-000000000004', 'Ravi Kumar', 'student', 'Volunteer', 'School of Law', '9876543213', 'ravi.kumar@student.edu'),
  ('a1000000-0000-0000-0000-000000000005', 'Justice R. Venkataraman (Retd.)', 'external', 'Retired Judge', 'High Court', '9876543220', 'venkat.judge@email.com'),
  ('a1000000-0000-0000-0000-000000000006', 'Adv. Meera Iyer', 'external', 'Senior Advocate', 'District Bar Association', '9876543221', 'meera.iyer@email.com')
ON CONFLICT DO NOTHING;

-- ─── NOTE: Users will be created after auth users are set up ──
-- Uncomment and replace UUIDs with actual auth_user_ids:
INSERT INTO public.users (auth_user_id, role_id, person_id) VALUES
  (
    '5f6fa028-9eca-413c-afda-abc49b79e8c8',
    (SELECT id FROM roles WHERE name = 'faculty'),
    'a1000000-0000-0000-0000-000000000001'
  ),
  (
    '9cc88ff5-f247-49e9-9c6b-3f4ebb68b666',
    (SELECT id FROM roles WHERE name = 'team_lead'),
    'a1000000-0000-0000-0000-000000000002'
  ),
  (
    'b7f84848-a344-4b81-af8d-01083b7fe44a',
    (SELECT id FROM roles WHERE name = 'volunteer'),
    'a1000000-0000-0000-0000-000000000003'
  ),
  (
    'b1460f14-5d14-4c2b-bc3d-2972186d2249',
    (SELECT id FROM roles WHERE name = 'volunteer'),
    'a1000000-0000-0000-0000-000000000004'
  );