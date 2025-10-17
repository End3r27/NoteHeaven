-- Complete collaboration schema migration
-- supabase/migrations/20251017140000_add_collaboration_features.sql

-- Ensure profiles table has all required fields
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS nickname TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS favorite_color TEXT DEFAULT '#3b82f6',
ADD COLUMN IF NOT EXISTS is_profile_complete BOOLEAN DEFAULT false;

-- Add constraints
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS nickname_length;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS bio_length;
ALTER TABLE public.profiles
ADD CONSTRAINT nickname_length CHECK (char_length(nickname) >= 2 AND char_length(nickname) <= 50),
ADD CONSTRAINT bio_length CHECK (char_length(bio) <= 200);

-- Shared notes table (already exists, ensure it's complete)
CREATE TABLE IF NOT EXISTS public.shared_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shared_with UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('viewer', 'editor')),
  accepted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(note_id, shared_with)
);

CREATE INDEX IF NOT EXISTS idx_shared_notes_note_id ON public.shared_notes(note_id);
CREATE INDEX IF NOT EXISTS idx_shared_notes_shared_with ON public.shared_notes(shared_with);

-- Shared folders table (already exists, ensure it's complete)
CREATE TABLE IF NOT EXISTS public.shared_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID NOT NULL REFERENCES public.folders(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shared_with UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('viewer', 'editor', 'owner')),
  accepted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(folder_id, shared_with)
);

CREATE INDEX IF NOT EXISTS idx_shared_folders_folder_id ON public.shared_folders(folder_id);
CREATE INDEX IF NOT EXISTS idx_shared_folders_shared_with ON public.shared_folders(shared_with);

-- Comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_note_id ON public.comments(note_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_id);

-- Presence table
CREATE TABLE IF NOT EXISTS public.presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cursor_position JSONB,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(note_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_presence_note_id ON public.presence(note_id);
CREATE INDEX IF NOT EXISTS idx_presence_last_seen ON public.presence(last_seen);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('invite', 'comment', 'mention', 'edit', 'folder_invite')),
  payload JSONB NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

-- RLS Policies

-- Comments policies
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on accessible notes"
ON public.comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.notes
    WHERE notes.id = comments.note_id
    AND (
      notes.user_id = auth.uid()
      OR notes.is_public = true
      OR EXISTS (
        SELECT 1 FROM public.shared_notes
        WHERE shared_notes.note_id = notes.id
        AND shared_notes.shared_with = auth.uid()
        AND shared_notes.accepted = true
      )
    )
  )
);

CREATE POLICY "Users can create comments on accessible notes"
ON public.comments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.notes
    WHERE notes.id = comments.note_id
    AND (
      notes.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.shared_notes
        WHERE shared_notes.note_id = notes.id
        AND shared_notes.shared_with = auth.uid()
        AND shared_notes.accepted = true
      )
    )
  )
);

CREATE POLICY "Users can update own comments"
ON public.comments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
ON public.comments FOR DELETE
USING (auth.uid() = user_id);

-- Presence policies
ALTER TABLE public.presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view presence on accessible notes"
ON public.presence FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.notes
    WHERE notes.id = presence.note_id
    AND (
      notes.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.shared_notes
        WHERE shared_notes.note_id = notes.id
        AND shared_notes.shared_with = auth.uid()
        AND shared_notes.accepted = true
      )
    )
  )
);

CREATE POLICY "Users can manage own presence"
ON public.presence FOR ALL
USING (auth.uid() = user_id);

-- Notifications policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

-- Function to clean up old presence data
CREATE OR REPLACE FUNCTION public.cleanup_old_presence()
RETURNS void AS $$
BEGIN
  DELETE FROM public.presence
  WHERE last_seen < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification
CREATE OR REPLACE FUNCTION public.create_notification(
  p_recipient_id UUID,
  p_sender_id UUID,
  p_type TEXT,
  p_payload JSONB
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (recipient_id, sender_id, type, payload)
  VALUES (p_recipient_id, p_sender_id, p_type, p_payload)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update comments updated_at
CREATE OR REPLACE FUNCTION public.update_comment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_comments ON public.comments;
CREATE TRIGGER set_updated_at_comments
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.update_comment_timestamp();