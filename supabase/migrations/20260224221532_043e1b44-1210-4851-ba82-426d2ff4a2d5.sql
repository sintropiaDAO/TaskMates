
-- Table for multiple completion proofs per task
CREATE TABLE public.task_completion_proofs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  proof_url TEXT NOT NULL,
  proof_type TEXT NOT NULL DEFAULT 'image',
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_completion_proofs ENABLE ROW LEVEL SECURITY;

-- Anyone can view proofs
CREATE POLICY "Anyone can view completion proofs"
ON public.task_completion_proofs
FOR SELECT
USING (true);

-- Task participants can add proofs (owner, approved collaborators, approved requesters)
CREATE POLICY "Task participants can add proofs"
ON public.task_completion_proofs
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND (
    -- Task owner
    EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_completion_proofs.task_id AND tasks.created_by = auth.uid())
    OR
    -- Approved collaborator/requester
    EXISTS (SELECT 1 FROM task_collaborators WHERE task_collaborators.task_id = task_completion_proofs.task_id AND task_collaborators.user_id = auth.uid() AND task_collaborators.approval_status = 'approved')
  )
);

-- Users can delete own proofs
CREATE POLICY "Users can delete own proofs"
ON public.task_completion_proofs
FOR DELETE
USING (auth.uid() = user_id);
