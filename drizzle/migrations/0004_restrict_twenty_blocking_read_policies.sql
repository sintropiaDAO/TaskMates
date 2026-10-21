CREATE OR REPLACE FUNCTION public.can_view_profile(_profile_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = _profile_id
      AND (p.id = auth.uid() OR NOT EXISTS (
        SELECT 1 FROM public.user_blocks b
        WHERE (b.blocker_id = p.id AND b.blocked_id = auth.uid())
           OR (b.blocker_id = auth.uid() AND b.blocked_id = p.id)
      ))
  );
$$;
REVOKE ALL ON FUNCTION public.can_view_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_profile(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.can_view_tag(_tag_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tags t WHERE t.id = _tag_id
      AND (
        t.category <> 'communities'
        OR NOT EXISTS (SELECT 1 FROM public.community_settings s WHERE s.tag_id = t.id AND s.is_hidden)
        OR (auth.uid() IS NOT NULL AND (
          t.created_by = auth.uid()
          OR EXISTS (SELECT 1 FROM public.community_admins a WHERE a.tag_id = t.id AND a.user_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.user_tags m WHERE m.tag_id = t.id AND m.user_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.community_invites i WHERE i.tag_id = t.id AND i.invited_user_id = auth.uid() AND i.status IN ('pending','accepted'))
        ))
      )
  );
$$;
REVOKE ALL ON FUNCTION public.can_view_tag(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_tag(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.can_view_entity(_entity_type text, _entity_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  owner_id uuid;
  linked_tags uuid[];
BEGIN
  IF _entity_type = 'task' THEN
    SELECT t.created_by INTO owner_id FROM public.tasks t WHERE t.id = _entity_id;
    IF NOT FOUND THEN RETURN false; END IF;
    SELECT array_agg(tt.tag_id) INTO linked_tags FROM public.task_tags tt WHERE tt.task_id = _entity_id;
  ELSIF _entity_type = 'product' THEN
    SELECT p.created_by INTO owner_id FROM public.products p WHERE p.id = _entity_id;
    IF NOT FOUND THEN RETURN false; END IF;
    SELECT array_agg(pt.tag_id) INTO linked_tags FROM public.product_tags pt WHERE pt.product_id = _entity_id;
  ELSIF _entity_type IN ('poll', 'opinion') THEN
    SELECT p.created_by INTO owner_id FROM public.polls p WHERE p.id = _entity_id;
    IF NOT FOUND THEN RETURN false; END IF;
    SELECT array_agg(pt.tag_id) INTO linked_tags FROM public.poll_tags pt WHERE pt.poll_id = _entity_id;
  ELSIF _entity_type IN ('profile', 'user') THEN
    RETURN public.can_view_profile(_entity_id);
  ELSIF _entity_type IN ('tag', 'community') THEN
    RETURN public.can_view_tag(_entity_id);
  ELSE
    RETURN false;
  END IF;
  IF owner_id = auth.uid() THEN RETURN true; END IF;
  IF NOT public.can_view_profile(owner_id) THEN RETURN false; END IF;
  RETURN NOT EXISTS (
    SELECT 1 FROM public.tags t WHERE t.id = ANY(COALESCE(linked_tags, ARRAY[]::uuid[])) AND t.category = 'communities'
  ) OR EXISTS (
    SELECT 1 FROM public.tags t WHERE t.id = ANY(COALESCE(linked_tags, ARRAY[]::uuid[]))
      AND t.category = 'communities' AND public.can_view_tag(t.id)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.can_view_entity(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_entity(text, uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.can_view_report_reactions(_report_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.reports r WHERE r.id = _report_id
      AND (public.is_admin() OR r.reporter_id = auth.uid() OR public.can_view_entity(r.entity_type, r.entity_id))
  );
$$;
REVOKE ALL ON FUNCTION public.can_view_report_reactions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_report_reactions(uuid) TO authenticated, service_role;

ALTER POLICY "Anyone can view tasks" ON public.tasks USING (public.can_view_entity('task', id));
ALTER POLICY "Anyone can view likes" ON public.task_likes USING (public.can_view_entity('task', task_id));
ALTER POLICY "Anyone can view comments" ON public.task_comments USING (public.can_view_entity('task', task_id));
ALTER POLICY "Anyone can view votes" ON public.task_votes USING (public.can_view_entity('task', task_id));
ALTER POLICY "Attendees are viewable by everyone" ON public.task_attendees USING (public.can_view_entity('task', task_id));
ALTER POLICY "Anyone can view feedback" ON public.task_feedback USING (public.can_view_entity('task', task_id));
ALTER POLICY "Anyone can view completion proofs" ON public.task_completion_proofs USING (public.can_view_entity('task', task_id));
ALTER POLICY "Anyone can view ratings" ON public.task_ratings USING (public.can_view_entity('task', task_id));
ALTER POLICY "Anyone can view collaborators" ON public.task_collaborators USING (public.can_view_entity('task', task_id));
ALTER POLICY "Anyone can view task_tags" ON public.task_tags USING (public.can_view_entity('task', task_id) AND public.can_view_tag(tag_id));
ALTER POLICY "Anyone can view task_products" ON public.task_products USING (public.can_view_entity('task', task_id) AND public.can_view_entity('product', product_id));
ALTER POLICY "Anyone can view task_highlights" ON public.task_highlights USING (
  (task_id IS NULL OR public.can_view_entity('task', task_id))
  AND (product_id IS NULL OR public.can_view_entity('product', product_id))
  AND (poll_id IS NULL OR public.can_view_entity('poll', poll_id))
  AND (task_id IS NOT NULL OR product_id IS NOT NULL OR poll_id IS NOT NULL)
);
ALTER POLICY "Anyone can view poll_votes" ON public.poll_votes USING (public.can_view_entity('poll', poll_id));
ALTER POLICY "Authenticated users can view profiles" ON public.profiles USING (public.can_view_profile(id));
ALTER POLICY "Users can view any visibility settings" ON public.profile_section_visibility USING (auth.uid() = user_id);
ALTER POLICY "Users can view all user_tags" ON public.user_tags USING (public.can_view_profile(user_id) AND public.can_view_tag(tag_id));
ALTER POLICY "Anyone can view follows" ON public.follows USING (public.can_view_profile(follower_id) AND public.can_view_profile(following_id));
ALTER POLICY "Anyone can view vouches" ON public.user_vouches USING (public.can_view_profile(voucher_id) AND public.can_view_profile(vouched_user_id));
ALTER POLICY "Anyone can view community admins" ON public.community_admins USING (public.can_view_tag(tag_id) AND public.can_view_profile(user_id));
ALTER POLICY "Anyone authenticated can view report likes" ON public.report_likes USING (public.can_view_report_reactions(report_id));

-- A caller cannot grant themselves private-community access by inserting an arbitrary membership.
ALTER POLICY "Users can manage own tags" ON public.user_tags WITH CHECK (auth.uid() = user_id AND public.can_view_tag(tag_id));

-- Only effective display flags are shared, never raw settings identifiers or timestamps.
CREATE OR REPLACE FUNCTION public.get_public_profile_visibility(_user_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE WHEN auth.uid() IS NOT NULL AND public.can_view_profile(_user_id) THEN
    jsonb_build_object(
      'show_coins', COALESCE(v.show_coins, true),
      'show_completed_chart', COALESCE(v.show_completed_chart, true),
      'show_ratings', COALESCE(v.show_ratings, true),
      'show_recent_activity', COALESCE(v.show_recent_activity, true),
      'show_my_action_plan', COALESCE(v.show_my_action_plan, false),
      'show_my_demands', COALESCE(v.show_my_demands, false),
      'show_my_impact', COALESCE(v.show_my_impact, false),
      'show_my_deliver', COALESCE(v.show_my_deliver, false),
      'show_my_receive', COALESCE(v.show_my_receive, false),
      'show_my_delivered', COALESCE(v.show_my_delivered, false),
      'show_my_voting', COALESCE(v.show_my_voting, false),
      'show_my_completed_polls', COALESCE(v.show_my_completed_polls, false),
      'show_my_highlights', COALESCE(v.show_my_highlights, false)
    ) ELSE NULL END
  FROM (SELECT 1) seed LEFT JOIN public.profile_section_visibility v ON v.user_id = _user_id;
$$;
REVOKE ALL ON FUNCTION public.get_public_profile_visibility(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile_visibility(uuid) TO authenticated, service_role;