-- Enhanced profile and social features migration
-- Migration: 20251018000001_add_social_and_presence_features

-- 1. Add last_seen_at to profiles for presence tracking
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Create followers table for social features
CREATE TABLE IF NOT EXISTS public.followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_follow_relationship UNIQUE(follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

-- 3. Create indexes for followers table
CREATE INDEX IF NOT EXISTS idx_followers_follower_id ON public.followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following_id ON public.followers(following_id);
CREATE INDEX IF NOT EXISTS idx_followers_created_at ON public.followers(created_at);

-- 4. Enable RLS on followers table
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies for followers table
CREATE POLICY "Users can view all follow relationships"
ON public.followers
FOR SELECT
USING (true);

CREATE POLICY "Users can create follow relationships for themselves"
ON public.followers
FOR INSERT
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete their own follow relationships"
ON public.followers
FOR DELETE
USING (auth.uid() = follower_id);

-- 6. Update profiles RLS policies to allow public profile viewing
DROP POLICY IF EXISTS "User profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;

CREATE POLICY "Profiles are publicly viewable"
ON public.profiles
FOR SELECT
USING (true);

-- 7. Add functions for follower counts
CREATE OR REPLACE FUNCTION get_follower_count(user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.followers
    WHERE following_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_following_count(user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.followers
    WHERE follower_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Add function to check if user A follows user B
CREATE OR REPLACE FUNCTION is_following(follower_id UUID, following_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.followers
    WHERE followers.follower_id = is_following.follower_id
    AND followers.following_id = is_following.following_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Update user_presence table structure for better real-time collaboration
ALTER TABLE public.user_presence
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS cursor_x INTEGER,
ADD COLUMN IF NOT EXISTS cursor_y INTEGER,
ADD COLUMN IF NOT EXISTS selection_start INTEGER,
ADD COLUMN IF NOT EXISTS selection_end INTEGER;

-- Update existing cursor_position JSON to individual columns for better performance
UPDATE public.user_presence 
SET 
  cursor_x = COALESCE((cursor_position->>'x')::INTEGER, 0),
  cursor_y = COALESCE((cursor_position->>'y')::INTEGER, 0)
WHERE cursor_position IS NOT NULL;

-- 10. Add indexes for user_presence for better real-time performance
CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen ON public.user_presence(last_seen);
CREATE INDEX IF NOT EXISTS idx_user_presence_is_active ON public.user_presence(is_active);
CREATE INDEX IF NOT EXISTS idx_user_presence_note_active ON public.user_presence(note_id, is_active);

-- 11. Function to update user's last seen timestamp
CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET last_seen_at = NOW()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Trigger to automatically update last_seen_at when user_presence changes
DROP TRIGGER IF EXISTS trigger_update_last_seen ON public.user_presence;
CREATE TRIGGER trigger_update_last_seen
  AFTER INSERT OR UPDATE ON public.user_presence
  FOR EACH ROW
  EXECUTE FUNCTION update_last_seen();