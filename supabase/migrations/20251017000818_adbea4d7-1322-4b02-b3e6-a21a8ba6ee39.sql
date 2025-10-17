-- Add attachments table for file uploads
CREATE TABLE IF NOT EXISTS public.attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  filesize BIGINT NOT NULL,
  mime_type TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Users can view attachments for notes they can access
CREATE POLICY "Users can view attachments for accessible notes"
ON public.attachments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.notes
    WHERE notes.id = attachments.note_id
    AND notes.user_id = auth.uid()
  )
);

-- Users can manage attachments for their own notes
CREATE POLICY "Users can manage attachments for own notes"
ON public.attachments
FOR ALL
USING (auth.uid() = user_id);

-- Add used_storage to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS used_storage BIGINT DEFAULT 0;

-- Alter profiles table for NoteHaven Campus
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS nickname TEXT,
ADD COLUMN IF NOT EXISTS profile_pic_url TEXT,
ADD COLUMN IF NOT EXISTS favorite_color TEXT DEFAULT '#3b82f6',
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS is_profile_complete BOOLEAN DEFAULT false;

-- Add constraints to profiles table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'nickname_length' and conrelid = 'public.profiles'::regclass) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT nickname_length CHECK (char_length(nickname) >= 2 AND char_length(nickname) <= 50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bio_length' and conrelid = 'public.profiles'::regclass) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT bio_length CHECK (char_length(bio) <= 200);
  END IF;
END $$;


-- Drop existing policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Everyone can view user profiles (for collaboration)
CREATE POLICY "User profiles are viewable by everyone"
ON public.profiles
FOR SELECT
USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- Create shared folders table
CREATE TABLE IF NOT EXISTS public.shared_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id UUID NOT NULL REFERENCES public.folders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  permission TEXT NOT NULL CHECK (permission IN ('viewer', 'editor', 'owner')),
  invited_by UUID NOT NULL,
  accepted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(folder_id, user_id)
);

-- Enable RLS
ALTER TABLE public.shared_folders ENABLE ROW LEVEL SECURITY;

-- Users can view their own shared folder invites
CREATE POLICY "Users can view own shared folders"
ON public.shared_folders
FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = invited_by);

-- Users can manage shared folders they own
CREATE POLICY "Folder owners can manage shares"
ON public.shared_folders
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.folders
    WHERE folders.id = shared_folders.folder_id
    AND folders.user_id = auth.uid()
  )
);

-- Users can accept their invites
CREATE POLICY "Users can accept own invites"
ON public.shared_folders
FOR UPDATE
USING (auth.uid() = user_id);

-- Create shared notes table
CREATE TABLE IF NOT EXISTS public.shared_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  permission TEXT NOT NULL CHECK (permission IN ('viewer', 'editor')),
  invited_by UUID NOT NULL,
  accepted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(note_id, user_id)
);

-- Enable RLS
ALTER TABLE public.shared_notes ENABLE ROW LEVEL SECURITY;

-- Users can view their own shared note invites
CREATE POLICY "Users can view own shared notes"
ON public.shared_notes
FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = invited_by);

-- Note owners can manage shares
CREATE POLICY "Note owners can manage shares"
ON public.shared_notes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.notes
    WHERE notes.id = shared_notes.note_id
    AND notes.user_id = auth.uid()
  )
);

-- Users can accept their invites
CREATE POLICY "Users can accept note invites"
ON public.shared_notes
FOR UPDATE
USING (auth.uid() = user_id);

-- Add public sharing columns to notes
ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS public_uuid UUID DEFAULT gen_random_uuid() UNIQUE;

-- Create index for public notes lookup
CREATE INDEX IF NOT EXISTS idx_notes_public_uuid ON public.notes(public_uuid) WHERE is_public = true;

-- Allow public access to public notes
CREATE POLICY "Public notes are viewable by everyone"
ON public.notes
FOR SELECT
USING (is_public = true);

-- The trigger set_updated_at_profiles already exists from the first migration.