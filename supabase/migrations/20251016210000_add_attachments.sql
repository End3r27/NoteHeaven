-- Create attachments table
CREATE TABLE IF NOT EXISTS public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  filesize BIGINT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own attachments"
  ON public.attachments FOR ALL
  USING (auth.uid() = user_id);

-- Add used_storage to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS used_storage BIGINT NOT NULL DEFAULT 0;

-- Create function to update used_storage on attachment changes
CREATE OR REPLACE FUNCTION public.update_user_storage()
RETURNS TRIGGER AS $$
DECLARE
  storage_change BIGINT;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    storage_change := NEW.filesize;
    UPDATE public.profiles
    SET used_storage = used_storage + storage_change
    WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    storage_change := OLD.filesize;
    UPDATE public.profiles
    SET used_storage = used_storage - storage_change
    WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call the function
DROP TRIGGER IF EXISTS on_attachment_change ON public.attachments;
CREATE TRIGGER on_attachment_change
  AFTER INSERT OR DELETE ON public.attachments
  FOR EACH ROW EXECUTE FUNCTION public.update_user_storage();

-- Create a storage bucket for attachments
-- Note: This needs to be run manually or via Supabase dashboard if not already done.
-- The RLS policies below will secure it.
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage bucket
CREATE POLICY "Users can view own attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'attachments' AND auth.uid() = owner);

CREATE POLICY "Users can upload attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'attachments' AND auth.uid() = owner);

CREATE POLICY "Users can delete own attachments"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'attachments' AND auth.uid() = owner);

CREATE POLICY "Users can update own attachments"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'attachments' AND auth.uid() = owner);