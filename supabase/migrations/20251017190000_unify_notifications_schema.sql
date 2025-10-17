-- Unify notifications schema and backfill data for consistent UI rendering
-- This migration standardizes columns to:
--   user_id, sender_id, type, title, content, resource_id, resource_type, is_read, created_at
-- It also backfills from legacy fields (recipient_id, read, payload, data, actor_id, message)
-- and ensures FKs to public.profiles with a stable sender FK name used by the app join.

BEGIN;

-- 1) Ensure required columns exist
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS sender_id UUID,
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS resource_id UUID,
  ADD COLUMN IF NOT EXISTS resource_type TEXT,
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 2) Migrate legacy columns to new ones (if legacy columns exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'recipient_id'
  ) THEN
    UPDATE public.notifications
      SET user_id = COALESCE(user_id, recipient_id)
      WHERE user_id IS NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'read'
  ) THEN
    UPDATE public.notifications
      SET is_read = COALESCE(is_read, read)
      WHERE read IS NOT NULL;
  END IF;
END $$;

-- message -> content
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'message'
  ) THEN
    UPDATE public.notifications
      SET content = COALESCE(content, message)
      WHERE content IS NULL AND message IS NOT NULL;
  END IF;
END $$;

-- actor_id -> sender_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'actor_id'
  ) THEN
    UPDATE public.notifications
      SET sender_id = COALESCE(sender_id, actor_id)
      WHERE sender_id IS NULL AND actor_id IS NOT NULL;
  END IF;
END $$;

-- Backfill resource_type and resource_id from payload/data JSON if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'payload'
  ) THEN
    -- resource_type from payload
    UPDATE public.notifications
      SET resource_type = COALESCE(resource_type, payload->>'resource_type')
      WHERE resource_type IS NULL AND payload IS NOT NULL;

    -- resource_id from payload variants
    UPDATE public.notifications
      SET resource_id = COALESCE(
        resource_id,
        NULLIF((payload->>'resource_id'),'')::uuid,
        NULLIF((payload->>'note_id'),'')::uuid,
        NULLIF((payload->>'folder_id'),'')::uuid
      )
      WHERE resource_id IS NULL AND payload IS NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'data'
  ) THEN
    -- resource_type from data
    UPDATE public.notifications
      SET resource_type = COALESCE(
        resource_type,
        CASE
          WHEN (data ? 'resource_type') THEN data->>'resource_type'
          WHEN (data ? 'folderId') THEN 'folder'
          WHEN (data ? 'noteId') THEN 'note'
          ELSE NULL
        END
      )
      WHERE resource_type IS NULL AND data IS NOT NULL;

    -- resource_id from data variants
    UPDATE public.notifications
      SET resource_id = COALESCE(
        resource_id,
        NULLIF((data->>'resource_id'),'')::uuid,
        NULLIF((data->>'noteId'),'')::uuid,
        NULLIF((data->>'folderId'),'')::uuid
      )
      WHERE resource_id IS NULL AND data IS NOT NULL;
  END IF;
END $$;

-- 3) Normalize/Map notification types
-- Map legacy values to canonical ones expected by the app
UPDATE public.notifications
SET type = 'share_invite'
WHERE type IN ('invite', 'folder_invite');

-- 4) Backfill title and content for invitations
-- Set a default title when missing
UPDATE public.notifications n
SET title = COALESCE(
  title,
  CASE
    WHEN n.type = 'share_invite' THEN
      CASE
        WHEN n.resource_type = 'folder' THEN 'Folder invitation'
        WHEN n.resource_type = 'note' THEN 'Note invitation'
        ELSE 'Invitation'
      END
    ELSE 'Notification'
  END
)
WHERE title IS NULL;

-- Content backfill using sender profile
UPDATE public.notifications n
SET content = COALESCE(
  content,
  p.nickname || ' invited you to collaborate on the ' ||
  CASE WHEN n.resource_type = 'folder' THEN 'folder' ELSE 'note' END
)
FROM public.profiles p
WHERE n.type = 'share_invite'
  AND n.content IS NULL
  AND n.sender_id = p.id;

-- Fallback content for invitations without sender
UPDATE public.notifications n
SET content = COALESCE(content, 'You have been invited to collaborate.')
WHERE n.type = 'share_invite' AND n.content IS NULL;

-- 5) Constraints and checks
-- Ensure type only has allowed values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'notifications' AND constraint_name = 'notifications_type_check'
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_type_check
      CHECK (type IN ('new_comment','comment_reply','share_invite','share_accept','note_fork','system'));
  END IF;
END $$;

-- Ensure resource_type is valid if present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'notifications' AND constraint_name = 'notifications_resource_type_check'
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_resource_type_check
      CHECK (
        (resource_id IS NULL AND resource_type IS NULL) OR
        (resource_id IS NOT NULL AND resource_type IN ('note','folder'))
      );
  END IF;
END $$;

-- Ensure NOT NULL on key fields after backfill
UPDATE public.notifications SET title = COALESCE(title, 'Notification') WHERE title IS NULL;
ALTER TABLE public.notifications
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN type SET NOT NULL,
  ALTER COLUMN title SET NOT NULL;

-- 6) Foreign keys to profiles with stable names
-- user_id -> profiles(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'notifications' AND constraint_name = 'notifications_user_id_fkey'
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- sender_id -> profiles(id), matches app join on notifications_sender_id_fkey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'notifications' AND constraint_name = 'notifications_sender_id_fkey'
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_sender_id_fkey
      FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 7) Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON public.notifications (user_id) WHERE NOT is_read;

-- 8) RLS policies (idempotent)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Users can view own notifications'
  ) THEN
    CREATE POLICY "Users can view own notifications"
      ON public.notifications FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Users can update own notifications'
  ) THEN
    CREATE POLICY "Users can update own notifications"
      ON public.notifications FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- 9) Drop obsolete legacy columns if they exist (safe cleanup)
ALTER TABLE public.notifications
  DROP COLUMN IF EXISTS recipient_id,
  DROP COLUMN IF EXISTS read,
  DROP COLUMN IF EXISTS payload,
  DROP COLUMN IF EXISTS data;

COMMIT;
