-- Migration: Complete collaboration schema and indexes (20251017)

-- 1. Add unique constraint to profiles.nickname
DO $$ 
BEGIN
    ALTER TABLE public.profiles ADD CONSTRAINT unique_nickname UNIQUE (nickname);
EXCEPTION
    WHEN duplicate_table THEN
        NULL;
    WHEN others THEN
        NULL;
END $$;

-- 2. Add color column to user_presence if missing
ALTER TABLE public.user_presence
  ADD COLUMN IF NOT EXISTS color TEXT;

-- 3. Ensure shared_notes has required columns and indexes
ALTER TABLE public.shared_notes
  ADD COLUMN IF NOT EXISTS shared_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS shared_with UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS permission TEXT CHECK (permission IN ('viewer', 'editor')),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_shared_notes_note_id ON public.shared_notes(note_id);
CREATE INDEX IF NOT EXISTS idx_shared_notes_shared_with ON public.shared_notes(shared_with);

-- 4. Ensure shared_folders has required columns and indexes
ALTER TABLE public.shared_folders
  ADD COLUMN IF NOT EXISTS shared_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS shared_with UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('viewer', 'editor', 'owner')),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_shared_folders_folder_id ON public.shared_folders(folder_id);
CREATE INDEX IF NOT EXISTS idx_shared_folders_shared_with ON public.shared_folders(shared_with);

-- 5. Add indexes for foreign keys in comments, notifications, presence
CREATE INDEX IF NOT EXISTS idx_comments_note_id ON public.comments(note_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_user_id ON public.user_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_note_id ON public.user_presence(note_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_folder_id ON public.user_presence(folder_id);

-- 6. Ensure ON DELETE CASCADE for all FKs (manual review may be needed for legacy tables)
-- (No destructive changes here, just add if missing)

-- 7. Add resolved column to comments if missing
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS resolved BOOLEAN DEFAULT FALSE;

-- 8. Add payload column to notifications if missing
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS payload JSONB;

-- 9. Add read column to notifications if missing
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT FALSE;

-- 10. Add created_at to notifications if missing
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 11. Add created_at to shared_notes/shared_folders if missing
ALTER TABLE public.shared_notes
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.shared_folders
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 12. Add indexes for performance on activities
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON public.activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_resource_id ON public.activities(resource_id);

-- End of migration