
-- Allow community admins and tag creators to delete their own tags
CREATE POLICY "Tag creators can delete own tags"
ON public.tags
FOR DELETE
USING (auth.uid() = created_by);

-- Allow community admins to delete community tags
CREATE POLICY "Community admins can delete community tags"
ON public.tags
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM community_admins ca
    WHERE ca.tag_id = tags.id AND ca.user_id = auth.uid()
  )
);
