
-- task_highlights: remove direct client INSERT (bypasses star spend). Only service_role & SECURITY DEFINER RPC can insert.
DROP POLICY IF EXISTS "Authenticated users can insert highlights" ON public.task_highlights;

-- task_history: restrict SELECT to task participants (creator/approved collaborators) or admins.
DROP POLICY IF EXISTS "Authenticated users can view task history" ON public.task_history;

CREATE POLICY "Task participants can view task history"
  ON public.task_history
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_history.task_id AND t.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM public.task_collaborators tc
               WHERE tc.task_id = task_history.task_id
                 AND tc.user_id = auth.uid()
                 AND tc.approval_status = 'approved')
  );
