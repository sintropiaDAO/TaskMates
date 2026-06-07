
-- 1. Tighten chat-attachments storage INSERT to enforce uploader folder
DROP POLICY IF EXISTS "Users can upload chat attachments" ON storage.objects;
CREATE POLICY "Users can upload chat attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Fix list policy (was checking folder[1] but chat path uses folder[1]=uid for comments; keep consistent)
DROP POLICY IF EXISTS "Participants can list chat-attachments" ON storage.objects;
CREATE POLICY "Uploaders can list own chat-attachments" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 2. Protect products.delivery_code via column-level revoke
REVOKE SELECT (delivery_code) ON public.products FROM anon, authenticated;
-- Owner still reads via existing get_product_delivery_code RPC (SECURITY DEFINER)

-- 3. Restrict task_history INSERT to task creator or approved collaborator
DROP POLICY IF EXISTS "Authenticated users can insert task history" ON public.task_history;
CREATE POLICY "Task participants can insert task history" ON public.task_history
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_history.task_id AND t.created_by = auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.task_collaborators tc
        WHERE tc.task_id = task_history.task_id
          AND tc.user_id = auth.uid()
          AND tc.approval_status = 'approved'
      )
    )
  );

-- 4. Restrict poll_history INSERT to poll creator only; restrict view to authenticated
DROP POLICY IF EXISTS "Authenticated users can insert poll history" ON public.poll_history;
CREATE POLICY "Poll creator can insert poll history" ON public.poll_history
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.polls p WHERE p.id = poll_history.poll_id AND p.created_by = auth.uid())
  );

DROP POLICY IF EXISTS "Anyone can view poll history" ON public.poll_history;
CREATE POLICY "Authenticated users can view poll history" ON public.poll_history
  FOR SELECT TO authenticated
  USING (true);
