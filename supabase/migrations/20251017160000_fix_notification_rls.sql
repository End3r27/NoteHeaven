-- Drop existing policies to ensure a clean slate.
DROP POLICY IF EXISTS "Users can insert notifications for themselves" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert notifications they are sending" ON public.notifications;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users." ON public.profiles;

-- Allow users to insert notifications where they are the sender.
-- This is necessary for sending invites, mentions, etc. to other users.
CREATE POLICY "Users can insert notifications they are sending"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

-- Create a policy to allow authenticated users to view profiles.
-- This is required for the foreign key constraints on `notifications(user_id)`
-- and `notifications(sender_id)` to be validated during an INSERT.
CREATE POLICY "Profiles are viewable by authenticated users."
ON public.profiles
FOR SELECT
TO authenticated
USING (true);
