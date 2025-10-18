-- Comprehensive RLS Policy Fixes
-- Migration: 20251018000002_fix_rls_policies_comprehensive

-- =================================================================
-- 1. FIX NOTIFICATION POLICIES FOR COLLABORATION INVITES
-- =================================================================

-- Drop existing conflicting notification policies
DROP POLICY IF EXISTS "Users can insert notifications they are sending" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

-- Create comprehensive notification policies
CREATE POLICY "Users can view notifications intended for them"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications  
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE  
USING (auth.uid() = user_id);

-- CRITICAL: Allow users to INSERT notifications when they are the sender
-- This is essential for collaboration invites to work
CREATE POLICY "Users can send notifications to others"
ON public.notifications
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- =================================================================
-- 2. FIX SHARED FOLDER VISIBILITY POLICIES
-- =================================================================

-- Drop the potentially conflicting folder policy
DROP POLICY IF EXISTS "Collaborators can view shared folders" ON public.folders;

-- Check if folders table has existing policies and drop conflicting ones
DROP POLICY IF EXISTS "Users can view own folders" ON public.folders;
DROP POLICY IF EXISTS "Users can view folders" ON public.folders;

-- Create comprehensive folder visibility policy
CREATE POLICY "Users can view accessible folders"
ON public.folders
FOR SELECT
USING (
  -- Users can see their own folders
  auth.uid() = user_id
  OR 
  -- Users can see folders shared with them that they've accepted
  EXISTS (
    SELECT 1 
    FROM public.shared_folders sf
    WHERE sf.folder_id = folders.id 
    AND sf.user_id = auth.uid() 
    AND sf.accepted = true
  )
);

-- Ensure users can manage their own folders (drop first if exists)
DROP POLICY IF EXISTS "Users can manage own folders" ON public.folders;
CREATE POLICY "Users can manage own folders" ON public.folders
FOR ALL USING (auth.uid() = user_id);

-- =================================================================  
-- 3. FIX SHARED_FOLDERS TABLE POLICIES
-- =================================================================

-- Drop existing shared_folders policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own shared folders" ON public.shared_folders;
DROP POLICY IF EXISTS "Folder owners can manage shares" ON public.shared_folders;  
DROP POLICY IF EXISTS "Users can accept own invites" ON public.shared_folders;

-- Allow users to view shared folder relationships they're involved in
CREATE POLICY "Users can view relevant shared folder relationships"
ON public.shared_folders
FOR SELECT
USING (
  auth.uid() = user_id OR  -- User is the collaborator
  auth.uid() = invited_by OR  -- User sent the invite
  auth.uid() IN (  -- User owns the folder being shared
    SELECT f.user_id 
    FROM public.folders f 
    WHERE f.id = shared_folders.folder_id
  )
);

-- Allow folder owners to create/manage shares
CREATE POLICY "Folder owners can manage folder shares"
ON public.shared_folders
FOR ALL
USING (
  auth.uid() IN (
    SELECT f.user_id 
    FROM public.folders f 
    WHERE f.id = shared_folders.folder_id
  )
);

-- Allow users to accept/decline their own invites
CREATE POLICY "Users can respond to their invites"
ON public.shared_folders
FOR UPDATE
USING (auth.uid() = user_id);

-- =================================================================
-- 4. FIX USER_PRESENCE POLICIES FOR REAL-TIME COLLABORATION
-- =================================================================

-- Drop existing user_presence policies
DROP POLICY IF EXISTS "Users can view presence on accessible notes" ON public.user_presence;
DROP POLICY IF EXISTS "Users can manage own presence" ON public.user_presence;

-- Allow users to see presence on notes/folders they have access to
CREATE POLICY "Users can view presence on accessible resources"
ON public.user_presence
FOR SELECT
USING (
  -- Always allow viewing own presence
  auth.uid() = user_id
  OR
  -- Allow viewing presence on notes user owns or has access to
  (note_id IS NOT NULL AND (
    -- User owns the note
    auth.uid() IN (
      SELECT n.user_id 
      FROM public.notes n 
      WHERE n.id = user_presence.note_id
    )
    OR
    -- User has shared access to the note
    auth.uid() IN (
      SELECT sn.user_id 
      FROM public.shared_notes sn 
      WHERE sn.note_id = user_presence.note_id 
      AND sn.accepted = true
    )
  ))
  OR
  -- Allow viewing presence on folders user owns or has access to  
  (folder_id IS NOT NULL AND (
    -- User owns the folder
    auth.uid() IN (
      SELECT f.user_id 
      FROM public.folders f 
      WHERE f.id = user_presence.folder_id
    )
    OR
    -- User has shared access to the folder
    auth.uid() IN (
      SELECT sf.user_id 
      FROM public.shared_folders sf 
      WHERE sf.folder_id = user_presence.folder_id 
      AND sf.accepted = true
    )
  ))
);

-- Allow users to manage their own presence
CREATE POLICY "Users can manage own presence"
ON public.user_presence
FOR ALL
USING (auth.uid() = user_id);

-- =================================================================
-- 5. FIX NOTES POLICIES FOR SHARED ACCESS
-- =================================================================

-- Ensure notes can be viewed by collaborators
DROP POLICY IF EXISTS "Users can view shared notes" ON public.notes;
DROP POLICY IF EXISTS "Users can view accessible notes" ON public.notes;

CREATE POLICY "Users can view accessible notes"
ON public.notes
FOR SELECT
USING (
  -- Users can view their own notes
  auth.uid() = user_id
  OR
  -- Users can view notes shared directly with them
  auth.uid() IN (
    SELECT sn.user_id 
    FROM public.shared_notes sn 
    WHERE sn.note_id = notes.id 
    AND sn.accepted = true
  )
  OR
  -- Users can view notes in folders shared with them
  (folder_id IS NOT NULL AND auth.uid() IN (
    SELECT sf.user_id 
    FROM public.shared_folders sf 
    WHERE sf.folder_id = notes.folder_id 
    AND sf.accepted = true
  ))
  OR
  -- Public notes are viewable by everyone
  notes.is_public = true
);

-- Allow note owners and editors to update notes  
DROP POLICY IF EXISTS "Authorized users can edit notes" ON public.notes;
CREATE POLICY "Authorized users can edit notes"
ON public.notes
FOR UPDATE
USING (
  -- Owner can always edit
  auth.uid() = user_id
  OR
  -- Users with editor permission on the note
  auth.uid() IN (
    SELECT sn.user_id 
    FROM public.shared_notes sn 
    WHERE sn.note_id = notes.id 
    AND sn.permission = 'editor' 
    AND sn.accepted = true
  )
  OR
  -- Users with editor permission on the folder containing the note
  (folder_id IS NOT NULL AND auth.uid() IN (
    SELECT sf.user_id 
    FROM public.shared_folders sf 
    WHERE sf.folder_id = notes.folder_id 
    AND sf.permission IN ('editor', 'owner')
    AND sf.accepted = true
  ))
);

-- =================================================================
-- 6. ENSURE PROFILES CAN BE READ FOR COLLABORATION
-- =================================================================

-- Make sure the profiles policy allows reading for collaboration features
DROP POLICY IF EXISTS "Profiles are publicly viewable" ON public.profiles;
DROP POLICY IF EXISTS "User profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users." ON public.profiles;

-- Create a single, clear profile policy
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- =================================================================
-- 7. ENSURE SHARED_NOTES POLICIES ARE CORRECT
-- =================================================================

-- Drop existing shared_notes policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own shared notes" ON public.shared_notes;
DROP POLICY IF EXISTS "Note owners can manage shares" ON public.shared_notes;
DROP POLICY IF EXISTS "Users can accept note invites" ON public.shared_notes;

-- Allow users to view shared note relationships they're involved in
CREATE POLICY "Users can view relevant note shares"
ON public.shared_notes
FOR SELECT
USING (
  auth.uid() = user_id OR  -- User is the collaborator
  auth.uid() = invited_by OR  -- User sent the invite  
  auth.uid() IN (  -- User owns the note being shared
    SELECT n.user_id 
    FROM public.notes n 
    WHERE n.id = shared_notes.note_id
  )
);

-- Allow note owners to manage shares
CREATE POLICY "Note owners can manage note shares"
ON public.shared_notes
FOR ALL
USING (
  auth.uid() IN (
    SELECT n.user_id 
    FROM public.notes n 
    WHERE n.id = shared_notes.note_id
  )
);

-- Allow users to accept/decline their note invites
CREATE POLICY "Users can respond to note invites"
ON public.shared_notes
FOR UPDATE
USING (auth.uid() = user_id);