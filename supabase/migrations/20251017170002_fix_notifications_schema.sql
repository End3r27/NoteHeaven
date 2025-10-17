-- This migration corrects the schema for the notifications table to match the application code.

-- Add the 'message' column for the notification's text content.
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS message TEXT;

-- Add the 'data' column for storing structured metadata.
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;

-- Drop the old, incorrectly named 'payload' column.
ALTER TABLE public.notifications
DROP COLUMN IF EXISTS payload;
