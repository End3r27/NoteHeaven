-- Drop the old, more restrictive policy.
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;

-- Create a new policy that allows users to see notifications they've received OR sent.
-- This is necessary for the Realtime service to broadcast the full notification payload correctly.
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = sender_id);
