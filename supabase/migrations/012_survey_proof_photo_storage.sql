-- ================================================================
-- Migration 012: Survey Proof Photo Storage Infrastructure & RLS Policies
-- ================================================================

-- 1. Ensure the 'survey-proof-photos' storage bucket exists (Idempotent and private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('survey-proof-photos', 'survey-proof-photos', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Clean up existing policies for idempotent execution
DROP POLICY IF EXISTS "auth_users_upload_proofs" ON storage.objects;
DROP POLICY IF EXISTS "auth_users_read_proofs" ON storage.objects;
DROP POLICY IF EXISTS "auth_users_delete_proofs" ON storage.objects;

-- 3. Storage RLS Policies scoped strictly to 'survey-proof-photos' bucket

-- ALLOW authenticated users to upload photo objects to 'survey-proof-photos'
CREATE POLICY "auth_users_upload_proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'survey-proof-photos');

-- ALLOW authenticated users to read photo objects from 'survey-proof-photos'
CREATE POLICY "auth_users_read_proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'survey-proof-photos');

-- ALLOW authenticated users to delete photo objects from 'survey-proof-photos'
CREATE POLICY "auth_users_delete_proofs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'survey-proof-photos');
