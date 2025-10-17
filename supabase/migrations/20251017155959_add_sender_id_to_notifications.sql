ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
