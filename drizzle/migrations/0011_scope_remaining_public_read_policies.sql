-- Replace always-true read rules with the shared visibility predicates.
ALTER POLICY "Anyone can view tags" ON public.tags USING (public.can_view_tag(id));
ALTER POLICY "Authenticated users can create tags" ON public.tags WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

ALTER POLICY "Authenticated users can create conversations" ON public.conversations WITH CHECK (
  auth.uid() IS NOT NULL
  AND entity_type IS NULL AND entity_id IS NULL
  AND (
    (type IN ('direct', 'group') AND task_id IS NULL)
    OR (type = 'task' AND task_id IS NOT NULL AND public.can_view_entity('task', task_id))
  )
);

ALTER POLICY "Anyone can view products" ON public.products USING (public.can_view_entity('product', id));
ALTER POLICY "Anyone can view product likes" ON public.product_likes USING (public.can_view_entity('product', product_id));
ALTER POLICY "Anyone can view product comments" ON public.product_comments USING (public.can_view_entity('product', product_id));
ALTER POLICY "Anyone can view product ratings" ON public.product_ratings USING (public.can_view_entity('product', product_id));
ALTER POLICY "Anyone can view product_tags" ON public.product_tags USING (public.can_view_entity('product', product_id) AND public.can_view_tag(tag_id));
ALTER POLICY "Anyone can view product comment likes" ON public.product_comment_likes USING (
  EXISTS (SELECT 1 FROM public.product_comments c WHERE c.id = comment_id AND public.can_view_entity('product', c.product_id))
);

ALTER POLICY "Anyone can view polls" ON public.polls USING (public.can_view_entity('poll', id));
ALTER POLICY "Anyone can view poll likes" ON public.poll_likes USING (public.can_view_entity('poll', poll_id));
ALTER POLICY "Anyone can view poll comments" ON public.poll_comments USING (public.can_view_entity('poll', poll_id));
ALTER POLICY "Anyone can view poll_options" ON public.poll_options USING (public.can_view_entity('poll', poll_id));
ALTER POLICY "Anyone can read poll questions" ON public.poll_questions USING (public.can_view_entity('poll', poll_id));
ALTER POLICY "Anyone can view poll_tags" ON public.poll_tags USING (public.can_view_entity('poll', poll_id) AND public.can_view_tag(tag_id));
ALTER POLICY "Anyone can view poll comment likes" ON public.poll_comment_likes USING (
  EXISTS (SELECT 1 FROM public.poll_comments c WHERE c.id = comment_id AND public.can_view_entity('poll', c.poll_id))
);

ALTER POLICY "Anyone can view comment likes" ON public.comment_likes USING (
  EXISTS (SELECT 1 FROM public.task_comments c WHERE c.id = comment_id AND public.can_view_entity('task', c.task_id))
);

ALTER POLICY "Anyone can view community related tags" ON public.community_related_tags USING (public.can_view_tag(community_tag_id) AND public.can_view_tag(related_tag_id));
ALTER POLICY "Anyone can view tag correlations" ON public.tag_correlations USING (public.can_view_tag(tag_id_1) AND public.can_view_tag(tag_id_2));
ALTER POLICY "Anyone can view tag translations" ON public.tag_translations USING (public.can_view_tag(tag_id));

ALTER POLICY "Anyone can view testimonials" ON public.testimonials USING (public.can_view_profile(profile_user_id) AND public.can_view_profile(author_user_id));
ALTER POLICY "Anyone can view testimonial_tags" ON public.testimonial_tags USING (
  public.can_view_tag(tag_id) AND EXISTS (
    SELECT 1 FROM public.testimonials t WHERE t.id = testimonial_id
      AND public.can_view_profile(t.profile_user_id) AND public.can_view_profile(t.author_user_id)
  )
);

-- Only the public feature flag is readable by clients; future settings stay private by default.
ALTER POLICY "Anyone can read app settings" ON public.app_settings USING (key = 'capy_vera_enabled');

-- Link previews are read and written only by the server with the privileged client.
DROP POLICY "Anyone can read cached link previews" ON public.link_previews;