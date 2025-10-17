-- First, drop the problematic policy if it exists
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can mark their notifications as read" ON public.notifications;
EXCEPTION
    WHEN undefined_object THEN
        NULL;
END $$;

-- Drop other potentially existing policies
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
EXCEPTION
    WHEN undefined_object THEN
        NULL;
END $$;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
EXCEPTION
    WHEN undefined_object THEN
        NULL;
END $$;

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('new_comment', 'comment_reply', 'share_invite', 'share_accept', 'note_fork')),
  title TEXT NOT NULL,
  content TEXT,
  resource_id UUID,
  resource_type TEXT CHECK (resource_type IN ('note', 'folder')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT notifications_resource_type_check 
    CHECK (
      (resource_id IS NULL AND resource_type IS NULL) OR 
      (resource_id IS NOT NULL AND resource_type IS NOT NULL)
    )
);

-- Add RLS policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies with corrected logic
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);
  
CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Create function to insert notifications
CREATE OR REPLACE FUNCTION public.insert_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_content TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_resource_type TEXT DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL
) RETURNS public.notifications AS $$
DECLARE
  v_notification public.notifications;
BEGIN
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    content,
    resource_id,
    resource_type,
    actor_id
  ) VALUES (
    p_user_id,
    p_type,
    p_title,
    p_content,
    p_resource_id,
    p_resource_type,
    COALESCE(p_actor_id, auth.uid())
  )
  RETURNING * INTO v_notification;
  
  RETURN v_notification;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to the insert_notification function
GRANT EXECUTE ON FUNCTION public.insert_notification TO authenticated;

-- Create function to mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_as_read(
  p_notification_id UUID
) RETURNS public.notifications AS $$
DECLARE
  v_notification public.notifications;
BEGIN
  UPDATE public.notifications
  SET is_read = true
  WHERE id = p_notification_id
  AND user_id = auth.uid()
  RETURNING * INTO v_notification;
  
  RETURN v_notification;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to the mark_notification_as_read function
GRANT EXECUTE ON FUNCTION public.mark_notification_as_read TO authenticated;

-- Create an index for quick access to unread notifications
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON public.notifications (user_id) WHERE NOT is_read;