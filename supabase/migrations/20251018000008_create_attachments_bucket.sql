-- Create and configure the attachments storage bucket
-- Migration: 20251018000008_create_attachments_bucket

-- =================================================================
-- CREATE STORAGE BUCKET FOR ATTACHMENTS
-- =================================================================

-- Create the attachments bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO UPDATE SET
  public = true;

-- =================================================================
-- STORAGE POLICIES FOR ATTACHMENTS BUCKET
-- =================================================================

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'attachments' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to view all attachments (public bucket)
CREATE POLICY "Anyone can view attachments"
ON storage.objects
FOR SELECT
USING (bucket_id = 'attachments');

-- Allow users to update their own profile pictures
CREATE POLICY "Users can update their own profile pictures"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own profile pictures
CREATE POLICY "Users can delete their own profile pictures"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =================================================================
-- ENSURE BUCKET IS PUBLIC
-- =================================================================

-- Make sure the bucket is properly configured as public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'attachments';