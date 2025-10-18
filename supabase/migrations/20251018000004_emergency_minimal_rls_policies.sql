-- EMERGENCY ULTRA-MINIMAL RLS POLICIES
-- This completely removes all complex RLS logic to restore basic functionality
-- Migration: 20251018000004_emergency_minimal_rls_policies

-- =================================================================
-- NUCLEAR OPTION: Drop ALL policies and start with absolute basics
-- =================================================================

-- Drop ALL existing policies that might be causing issues
DROP POLICY IF EXISTS "View folders shared with me" ON public.folders;
DROP POLICY IF EXISTS "Users can manage own folders" ON public.folders;
DROP POLICY IF EXISTS "View notes shared with me" ON public.notes;
DROP POLICY IF EXISTS "Users can edit own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can delete own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can create notes" ON public.notes;
DROP POLICY IF EXISTS "Users can manage own presence simple" ON public.user_presence;

-- =================================================================
-- ULTRA-MINIMAL POLICIES - JUST OWN DATA ACCESS
-- =================================================================

-- Folders: Only own folders, no sharing logic
CREATE POLICY "folders_minimal_own_only"
ON public.folders
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Notes: Only own notes, no sharing logic, no public notes
CREATE POLICY "notes_minimal_own_only"
ON public.notes
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Tags: Only own tags
CREATE POLICY "tags_minimal_own_only"
ON public.tags
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Note-Tags: Only own note-tag relationships
CREATE POLICY "note_tags_minimal_own_only"
ON public.note_tags
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.notes 
    WHERE notes.id = note_tags.note_id 
    AND notes.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.notes 
    WHERE notes.id = note_tags.note_id 
    AND notes.user_id = auth.uid()
  )
);

-- User presence: Only own presence
CREATE POLICY "user_presence_minimal_own_only"
ON public.user_presence
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =================================================================
-- KEEP NOTIFICATION POLICIES (THESE SEEM TO WORK)
-- =================================================================

-- Don't touch notification policies as they seem to be working fine