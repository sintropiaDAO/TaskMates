-- Replace permissive SELECT policy with privacy-respecting policies
DROP POLICY IF EXISTS "Anyone can view non-hidden community settings" ON public.community_settings;

CREATE POLICY "Public can view non-hidden community settings"
  ON public.community_settings
  FOR SELECT
  USING (is_hidden = false);

CREATE POLICY "Community admins can view own community settings"
  ON public.community_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_admins ca
      WHERE ca.tag_id = community_settings.tag_id AND ca.user_id = auth.uid()
    )
  );

CREATE POLICY "Followers can view hidden community settings"
  ON public.community_settings
  FOR SELECT
  TO authenticated
  USING (
    is_hidden = true AND EXISTS (
      SELECT 1 FROM public.user_tags ut
      WHERE ut.tag_id = community_settings.tag_id AND ut.user_id = auth.uid()
    )
  );

CREATE POLICY "Invited users can view hidden community settings"
  ON public.community_settings
  FOR SELECT
  TO authenticated
  USING (
    is_hidden = true AND EXISTS (
      SELECT 1 FROM public.community_invites ci
      WHERE ci.tag_id = community_settings.tag_id
        AND ci.invited_user_id = auth.uid()
        AND ci.status IN ('pending', 'accepted')
    )
  );

-- Helper that returns ONLY the IDs of hidden communities (no sensitive fields)
-- so the client can filter items belonging to hidden communities.
CREATE OR REPLACE FUNCTION public.get_hidden_community_tag_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tag_id FROM public.community_settings WHERE is_hidden = true;
$$;

REVOKE ALL ON FUNCTION public.get_hidden_community_tag_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_hidden_community_tag_ids() TO anon, authenticated;