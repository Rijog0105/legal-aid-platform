-- ================================================================
-- Migration 006: Add UPDATE Policy for camp_people
-- Allows Admin and Faculty to promote/demote project roles
-- ================================================================

CREATE POLICY "camp_people_update" ON public.camp_people FOR UPDATE
  TO authenticated USING (
    public.get_user_role() IN ('admin', 'faculty')
  ) WITH CHECK (
    public.get_user_role() IN ('admin', 'faculty')
  );
