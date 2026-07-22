-- ================================================================
-- Migration 004: Photo Documentation Storage Infrastructure & RLS Policies
-- Legal Aid Camp Documentation Platform
-- ================================================================

-- 1. Ensure the 'camp-photos' storage bucket exists (Idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('camp-photos', 'camp-photos', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Clean up existing policies for idempotent execution
DROP POLICY IF EXISTS "auth_users_upload_photos" ON storage.objects;
DROP POLICY IF EXISTS "auth_users_read_photos" ON storage.objects;
DROP POLICY IF EXISTS "auth_users_delete_photos" ON storage.objects;

-- 3. Storage RLS Policies on storage.objects scoped strictly to 'camp-photos' bucket

-- ALLOW authenticated users to upload photo objects to 'camp-photos'
CREATE POLICY "auth_users_upload_photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'camp-photos');

-- ALLOW authenticated users to read photo objects from 'camp-photos'
CREATE POLICY "auth_users_read_photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'camp-photos');

-- ALLOW authenticated users to delete photo objects from 'camp-photos'
CREATE POLICY "auth_users_delete_photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'camp-photos');
