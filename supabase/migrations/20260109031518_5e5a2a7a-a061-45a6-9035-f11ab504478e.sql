-- Add image_url column to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS image_url TEXT;