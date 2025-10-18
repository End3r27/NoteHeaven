-- Fix shared folder visibility: Allow collaborators to view shared folders
-- Migration: 20251018000000_fix_shared_folder_visibility

-- Create policy to allow collaborators to view shared folders
CREATE POLICY "Collaborators can view shared folders"
ON public.folders
FOR SELECT
USING (
  auth.uid() = user_id  -- Owner can view
  OR auth.uid() IN (    -- Collaborators can view
    SELECT user_id 
    FROM public.shared_folders 
    WHERE shared_folders.folder_id = folders.id 
    AND shared_folders.accepted = true
  )
);