-- Add priority column to tasks table
ALTER TABLE public.tasks ADD COLUMN priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT NULL;