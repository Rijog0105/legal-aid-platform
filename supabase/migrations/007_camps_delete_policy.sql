-- ================================================================
-- Migration 007: Extend camps DELETE policy to include Faculty
-- ================================================================
--
-- Root Cause:
--   The original "camps_delete" policy (migration 001) restricted
--   DELETE on the camps table to 'admin' role only.
--   Faculty users are a valid role for project deletion but were
--   silently blocked by RLS. Supabase PostgREST returns no error
--   when RLS blocks a DML statement — it returns success with
--   0 rows affected — causing the UI to incorrectly show a
--   success message while the project still exists in the database.
--
-- Fix:
--   Replace the restrictive policy with one that allows both
--   'admin' and 'faculty' roles to delete camp (project) records.
--
-- Safety:
--   This migration is idempotent. DROP POLICY IF EXISTS will not
--   error if the policy has already been removed. The CREATE POLICY
--   statement replaces the exact policy name from migration 001.
--   No other permissions or policies are modified.
-- ================================================================

-- Drop the old admin-only delete policy
DROP POLICY IF EXISTS "camps_delete" ON public.camps;

-- Create the corrected policy: both admin and faculty may delete projects
CREATE POLICY "camps_delete" ON public.camps FOR DELETE
  TO authenticated USING (
    public.get_user_role() IN ('admin', 'faculty')
  );
