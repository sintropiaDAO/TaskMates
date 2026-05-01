DROP POLICY IF EXISTS "Anyone can view task history" ON public.task_history;
DROP POLICY IF EXISTS "Public can view task history" ON public.task_history;
DROP POLICY IF EXISTS "Task history is viewable by everyone" ON public.task_history;

CREATE POLICY "Authenticated users can view task history"
ON public.task_history
FOR SELECT
TO authenticated
USING (true);