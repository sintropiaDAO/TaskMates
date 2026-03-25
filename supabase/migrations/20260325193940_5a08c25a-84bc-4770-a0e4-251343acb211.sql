
-- Table to store related tags for communities
CREATE TABLE public.community_related_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  related_tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(community_tag_id, related_tag_id)
);

-- Enable RLS
ALTER TABLE public.community_related_tags ENABLE ROW LEVEL SECURITY;

-- Anyone can view
CREATE POLICY "Anyone can view community related tags"
  ON public.community_related_tags FOR SELECT
  TO public
  USING (true);

-- Community admins can insert
CREATE POLICY "Community admins can insert related tags"
  ON public.community_related_tags FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.community_admins ca
      WHERE ca.tag_id = community_related_tags.community_tag_id
      AND ca.user_id = auth.uid()
    )
  );

-- Community admins can delete
CREATE POLICY "Community admins can delete related tags"
  ON public.community_related_tags FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.community_admins ca
      WHERE ca.tag_id = community_related_tags.community_tag_id
      AND ca.user_id = auth.uid()
    )
  );
