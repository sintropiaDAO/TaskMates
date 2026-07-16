DROP POLICY IF EXISTS "Anyone can view product_participants" ON public.product_participants;

CREATE POLICY "Participants and product owners can view participation"
ON public.product_participants
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_participants.product_id
      AND p.created_by = auth.uid()
  )
);