
-- Add auto-approval and limit columns to tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS auto_approve_collaborators boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_approve_requesters boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_collaborators integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS max_requesters integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS repeat_type text DEFAULT NULL CHECK (repeat_type IN ('daily','weekly','monthly','yearly','custom') OR repeat_type IS NULL),
  ADD COLUMN IF NOT EXISTS repeat_config jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS repeat_end_date date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS repeat_occurrences integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS enable_streak boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS streak_count integer DEFAULT 0;
