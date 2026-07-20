-- ================================================================
-- Migration 002: Fix missing DELETE policy on persons
-- Legal Aid Camp Documentation Platform
-- ================================================================
--
-- Bug: persons table had RLS enabled with SELECT/INSERT/UPDATE
-- policies but no DELETE policy. With RLS enabled, a command with
-- no matching policy silently affects 0 rows (not an error), which
-- made "Delete Person" appear to succeed while doing nothing.
--
-- Fix: add a DELETE policy mirroring persons_insert / persons_update
-- (admin or faculty only), consistent with the delete policies
-- already defined on camps, camp_people, activities, and expenses.
-- ================================================================

CREATE POLICY "persons_delete" ON public.persons FOR DELETE
  TO authenticated USING (
    public.get_user_role() IN ('admin', 'faculty')
  );
