-- ================================================================
-- Migration 018: Add DELETE Policy for photos Table
-- Scoped to admin, faculty, and the uploader of the photo.
-- ================================================================

CREATE POLICY "photos_delete" ON public.photos FOR DELETE
  TO authenticated USING (
    public.get_user_role() IN ('admin', 'faculty')
    OR uploaded_by = public.get_app_user_id()
  );
