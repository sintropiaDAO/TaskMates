
-- Add parent_task_id column to tasks table
ALTER TABLE public.tasks ADD COLUMN parent_task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL;

-- Create index for efficient hierarchy queries
CREATE INDEX idx_tasks_parent_task_id ON public.tasks(parent_task_id);
