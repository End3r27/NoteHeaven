-- Fix 500 Internal Server Errors by Simplifying RLS Policies
-- Migration: 20251018000003_simplify_rls_policies_fix_500_errors

-- =================================================================
-- EMERGENCY FIX: Drop all complex policies causing 500 errors
-- =================================================================

-- Drop the complex policies that are causing server errors
DROP POLICY IF EXISTS "Users can view accessible folders" ON public.folders;
DROP POLICY IF EXISTS "Users can view accessible notes" ON public.notes;
DROP POLICY IF EXISTS "Authorized users can edit notes" ON public.notes;
DROP POLICY IF EXISTS "Users can view presence on accessible resources" ON public.user_presence;

-- =================================================================
-- 1. RESTORE BASIC FOLDER FUNCTIONALITY FIRST
-- =================================================================

-- Simple folder policy - users can see their own folders
CREATE POLICY "Users can view own folders"
ON public.folders
FOR SELECT
USING (auth.uid() = user_id);

-- Users can manage their own folders
-- (keeping the existing "Users can manage own folders" policy)

-- =================================================================
-- 2. RESTORE BASIC NOTES FUNCTIONALITY
-- =================================================================

-- Simple notes policy - users can see their own notes and public notes
CREATE POLICY "Users can view own and public notes"
ON public.notes
FOR SELECT
USING (
  auth.uid() = user_id 
  OR notes.is_public = true
);

-- Users can edit their own notes
CREATE POLICY "Users can edit own notes"
ON public.notes
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own notes
CREATE POLICY "Users can delete own notes"
ON public.notes
FOR DELETE
USING (auth.uid() = user_id);

-- Users can create notes
CREATE POLICY "Users can create notes"
ON public.notes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- =================================================================
-- 3. SIMPLE USER PRESENCE POLICY
-- =================================================================

-- Simple presence policy - users can manage their own presence
CREATE POLICY "Users can manage own presence simple"
ON public.user_presence
FOR ALL
USING (auth.uid() = user_id);

-- =================================================================
-- 4. KEEP ESSENTIAL SHARED FOLDER POLICIES (SIMPLIFIED)
-- =================================================================

-- Keep the simpler shared folder policies that should work
-- These are less complex and shouldn't cause 500 errors

-- =================================================================
-- 5. ENSURE NOTIFICATION POLICIES ARE WORKING
-- =================================================================

-- Make sure the critical notification policies are in place
-- (These should already exist from the previous migration)

-- Verify notification policies exist (these should be simple enough)
DO $$
BEGIN
  -- Check if the send notifications policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'notifications' 
    AND policyname = 'Users can send notifications to others'
  ) THEN
    CREATE POLICY "Users can send notifications to others"
    ON public.notifications
    FOR INSERT
    WITH CHECK (auth.uid() = sender_id);
  END IF;
END $$;

-- =================================================================
-- 6. ADD BASIC SHARED ACCESS (SIMPLE VERSION)
-- =================================================================

-- Add a simple shared folder view policy (less complex)
CREATE POLICY "View folders shared with me"
ON public.folders
FOR SELECT
USING (
  -- Own folders
  auth.uid() = user_id
  OR
  -- Folders explicitly shared with me (simple check)
  id IN (
    SELECT folder_id 
    FROM public.shared_folders 
    WHERE user_id = auth.uid() 
    AND accepted = true
  )
);

-- Drop the previous simple policy to avoid conflicts
DROP POLICY IF EXISTS "Users can view own folders" ON public.folders;

-- =================================================================
-- 7. BASIC SHARED NOTES ACCESS
-- =================================================================

-- Add simple shared notes access
CREATE POLICY "View notes shared with me"
ON public.notes
FOR SELECT
USING (
  -- Own notes
  auth.uid() = user_id
  OR
  -- Public notes  
  notes.is_public = true
  OR
  -- Notes explicitly shared with me
  id IN (
    SELECT note_id 
    FROM public.shared_notes 
    WHERE user_id = auth.uid() 
    AND accepted = true
  )
);

-- Drop the previous simple policy to avoid conflicts
DROP POLICY IF EXISTS "Users can view own and public notes" ON public.notes;