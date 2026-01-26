-- Add location column to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS location text;

-- Create index for location queries
CREATE INDEX IF NOT EXISTS idx_tasks_location ON public.tasks (location);