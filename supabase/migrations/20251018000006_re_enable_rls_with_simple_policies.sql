-- Re-enable RLS with PROVEN simple policies
-- Migration: 20251018000006_re_enable_rls_with_simple_policies

-- We confirmed that disabling RLS fixed the 500 errors
-- Now we'll re-enable with the absolute simplest policies possible

-- =================================================================
-- RE-ENABLE RLS AND ADD MINIMAL WORKING POLICIES
-- =================================================================

-- Re-enable RLS
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_notes ENABLE ROW LEVEL SECURITY;

-- =================================================================
-- SUPER SIMPLE POLICIES - JUST AUTH.UID() CHECKS
-- =================================================================

-- Folders: Simple auth.uid() check only
CREATE POLICY "folders_simple_auth_check"
ON public.folders
FOR ALL
USING (auth.uid() = user_id);

-- Notes: Simple auth.uid() check only  
CREATE POLICY "notes_simple_auth_check"
ON public.notes
FOR ALL
USING (auth.uid() = user_id);

-- Tags: Simple auth.uid() check only
CREATE POLICY "tags_simple_auth_check"
ON public.tags
FOR ALL
USING (auth.uid() = user_id);

-- Note Tags: Just check if user owns the note (no complex joins)
CREATE POLICY "note_tags_simple_auth_check"
ON public.note_tags
FOR ALL
USING (
  note_id IN (
    SELECT id FROM public.notes WHERE user_id = auth.uid()
  )
);

-- User Presence: Simple auth.uid() check only
CREATE POLICY "user_presence_simple_auth_check"
ON public.user_presence
FOR ALL
USING (auth.uid() = user_id);

-- Shared Folders: Simple auth.uid() check only  
CREATE POLICY "shared_folders_simple_auth_check"
ON public.shared_folders
FOR ALL
USING (auth.uid() = user_id OR auth.uid() = invited_by);

-- Shared Notes: Simple auth.uid() check only
CREATE POLICY "shared_notes_simple_auth_check"
ON public.shared_notes
FOR ALL
USING (auth.uid() = user_id OR auth.uid() = invited_by);

-- =================================================================
-- NOTIFICATION POLICIES (KEEP EXISTING WORKING ONES)
-- =================================================================

-- Don't touch notification policies - they're already working