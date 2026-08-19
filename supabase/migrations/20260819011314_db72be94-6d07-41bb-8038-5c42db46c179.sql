-- poll_options: allow owner/admin edits of labels while poll is open
CREATE POLICY "Owners and admins can update options while poll is open"
ON public.poll_options
FOR UPDATE
TO authenticated
USING (
  (
    auth.uid() = created_by
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.polls p
      WHERE p.id = poll_options.poll_id AND p.created_by = auth.uid()
    )
  )
  AND EXISTS (
    SELECT 1 FROM public.polls p
    WHERE p.id = poll_options.poll_id
      AND p.status = 'active'
      AND (p.deadline IS NULL OR p.deadline > now())
  )
)
WITH CHECK (
  created_by = poll_options.created_by
  AND (
    auth.uid() = created_by
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.polls p
      WHERE p.id = poll_options.poll_id AND p.created_by = auth.uid()
    )
  )
);

-- products: prevent ownership transfer / tampering on update
DROP POLICY IF EXISTS "Users can update own products" ON public.products;
CREATE POLICY "Users can update own products"
ON public.products
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);