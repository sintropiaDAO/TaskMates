DROP POLICY IF EXISTS "Option creators can delete" ON public.poll_options;

CREATE POLICY "Option creators can delete while poll is open"
ON public.poll_options
FOR DELETE
TO authenticated
USING (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1 FROM public.polls p
    WHERE p.id = poll_options.poll_id
      AND p.status = 'active'
      AND (p.deadline IS NULL OR p.deadline > now())
  )
);

CREATE POLICY "Poll owners and admins can delete options"
ON public.poll_options
FOR DELETE
TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.polls p
    WHERE p.id = poll_options.poll_id
      AND p.created_by = auth.uid()
  )
);