-- 1. poll_history: restrict SELECT
DROP POLICY IF EXISTS "Authenticated users can view poll history" ON public.poll_history;

CREATE POLICY "Poll participants can view poll history"
ON public.poll_history
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.polls p WHERE p.id = poll_history.poll_id AND p.created_by = auth.uid())
  OR EXISTS (SELECT 1 FROM public.poll_votes v WHERE v.poll_id = poll_history.poll_id AND v.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.poll_comments c WHERE c.poll_id = poll_history.poll_id AND c.user_id = auth.uid())
);

-- 2. user_badges: owner-only direct reads
DROP POLICY IF EXISTS "Authenticated users can view badges" ON public.user_badges;

CREATE POLICY "Users can view their own badges"
ON public.user_badges
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Safe public projection for viewing other users' badges
CREATE OR REPLACE FUNCTION public.get_public_user_badges(_user_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  category text,
  level integer,
  entity_id text,
  entity_name text,
  metric_value integer,
  earned_at timestamp with time zone,
  notified boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT b.id,
         b.user_id,
         b.category,
         b.level,
         CASE WHEN b.user_id = auth.uid() OR b.category <> 'taskmates' THEN b.entity_id ELSE NULL END,
         CASE WHEN b.user_id = auth.uid() OR b.category <> 'taskmates' THEN b.entity_name ELSE NULL END,
         b.metric_value,
         b.earned_at,
         b.notified,
         b.created_at,
         b.updated_at
  FROM public.user_badges b
  WHERE b.user_id = _user_id
    AND auth.uid() IS NOT NULL
  ORDER BY b.level DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_user_badges(uuid) TO authenticated;