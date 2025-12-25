-- Add columns to tasks table to control collaboration/request buttons visibility
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS allow_collaboration boolean DEFAULT true;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS allow_requests boolean DEFAULT true;

-- The status column already exists in task_collaborators but let's ensure we have the right values
-- We'll use: 'collaborate', 'request' for initial status 
-- and 'approved', 'rejected' for final status
-- Let's add an approval_status column to track this separately
ALTER TABLE public.task_collaborators ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending';

-- Add policy to allow task owners to delete collaborators (for rejection)
CREATE POLICY "Task owners can delete collaborators" ON public.task_collaborators FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.tasks WHERE id = task_collaborators.task_id AND created_by = auth.uid())
);