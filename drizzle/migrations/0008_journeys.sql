CREATE TABLE public.journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  image_url text,
  created_by uuid NOT NULL,
  tag_ids uuid[] NOT NULL DEFAULT '{}',
  is_ordered boolean NOT NULL DEFAULT false,
  is_starter boolean NOT NULL DEFAULT false,
  deadline timestamptz,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.journey_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  title text,
  action text NOT NULL,
  item_kind text,
  item_type text,
  item_subtype text,
  tag_category text,
  tag_ids uuid[] NOT NULL DEFAULT '{}',
  tag_match text NOT NULL DEFAULT 'any',
  entity_id uuid,
  indicators jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.journey_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.journey_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active',
  joined_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  reward_delivered boolean NOT NULL DEFAULT false,
  UNIQUE (journey_id, user_id)
);
CREATE TABLE public.journey_step_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES public.journey_participants(id) ON DELETE CASCADE,
  step_id uuid NOT NULL REFERENCES public.journey_steps(id) ON DELETE CASCADE,
  entity_kind text,
  entity_id uuid,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (participant_id, step_id)
);
CREATE TABLE public.journey_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.journey_steps(journey_id);
CREATE INDEX ON public.journey_participants(user_id);
CREATE INDEX ON public.journey_comments(journey_id);
CREATE INDEX journeys_tag_ids_gin ON public.journeys USING gin(tag_ids);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.journeys, public.journey_steps, public.journey_rewards, public.journey_comments TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.journey_participants TO authenticated;
GRANT UPDATE (reward_delivered) ON public.journey_participants TO authenticated;
GRANT SELECT ON public.journey_step_progress TO authenticated;
GRANT ALL ON public.journeys, public.journey_steps, public.journey_rewards, public.journey_participants, public.journey_step_progress, public.journey_comments TO service_role;

ALTER TABLE public.journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_step_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_comments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_view_journey(_journey_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.journeys j WHERE j.id = _journey_id AND (
      j.created_by = auth.uid()
      OR EXISTS (SELECT 1 FROM public.journey_participants p WHERE p.journey_id = j.id AND p.user_id = auth.uid())
      OR (
        j.status = 'active'
        AND NOT public.is_blocked_by(auth.uid(), j.created_by)
        AND NOT EXISTS (SELECT 1 FROM unnest(j.tag_ids) t WHERE NOT public.can_view_tag(t))
      )
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_journey_owner(_journey_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.journeys WHERE id = _journey_id AND created_by = auth.uid());
$$;

CREATE POLICY "journeys select" ON public.journeys FOR SELECT TO authenticated USING (public.can_view_journey(id));
CREATE POLICY "journeys insert" ON public.journeys FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND is_starter = false);
CREATE POLICY "journeys update" ON public.journeys FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "journeys delete" ON public.journeys FOR DELETE TO authenticated USING (created_by = auth.uid());

CREATE POLICY "steps select" ON public.journey_steps FOR SELECT TO authenticated USING (public.can_view_journey(journey_id));
CREATE POLICY "steps write" ON public.journey_steps FOR ALL TO authenticated USING (public.is_journey_owner(journey_id)) WITH CHECK (public.is_journey_owner(journey_id));
CREATE POLICY "rewards select" ON public.journey_rewards FOR SELECT TO authenticated USING (public.can_view_journey(journey_id));
CREATE POLICY "rewards write" ON public.journey_rewards FOR ALL TO authenticated USING (public.is_journey_owner(journey_id)) WITH CHECK (public.is_journey_owner(journey_id));

CREATE POLICY "participants select" ON public.journey_participants FOR SELECT TO authenticated USING (public.can_view_journey(journey_id));
CREATE POLICY "participants join" ON public.journey_participants FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'active' AND public.can_view_journey(journey_id));
CREATE POLICY "participants leave" ON public.journey_participants FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "participants owner reward" ON public.journey_participants FOR UPDATE TO authenticated USING (public.is_journey_owner(journey_id)) WITH CHECK (public.is_journey_owner(journey_id));

CREATE POLICY "progress select" ON public.journey_step_progress FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.journey_participants p WHERE p.id = participant_id AND public.can_view_journey(p.journey_id))
);

CREATE POLICY "jcomments select" ON public.journey_comments FOR SELECT TO authenticated USING (public.can_view_journey(journey_id) AND NOT public.is_blocked_by(auth.uid(), user_id));
CREATE POLICY "jcomments insert" ON public.journey_comments FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() AND (public.is_journey_owner(journey_id)
    OR EXISTS (SELECT 1 FROM public.journey_participants p WHERE p.journey_id = journey_comments.journey_id AND p.user_id = auth.uid()))
);
CREATE POLICY "jcomments delete" ON public.journey_comments FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER journeys_updated_at BEFORE UPDATE ON public.journeys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Candidate actions a user took since a moment
CREATE OR REPLACE FUNCTION public.journey_candidates(_uid uuid, _since timestamptz, _action text, _kind text)
RETURNS TABLE(kind text, entity_id uuid, at timestamptz) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT 'task', t.id, t.created_at FROM tasks t WHERE _action = 'create' AND coalesce(_kind,'task') = 'task' AND t.created_by = _uid AND t.created_at >= _since
  UNION ALL SELECT 'product', p.id, p.created_at FROM products p WHERE _action = 'create' AND coalesce(_kind,'product') = 'product' AND p.created_by = _uid AND p.created_at >= _since
  UNION ALL SELECT 'poll', p.id, p.created_at FROM polls p WHERE _action = 'create' AND coalesce(_kind,'poll') = 'poll' AND p.created_by = _uid AND p.created_at >= _since
  UNION ALL SELECT 'task', t.id, t.updated_at FROM tasks t WHERE _action = 'complete' AND coalesce(_kind,'task') = 'task' AND t.status = 'completed' AND t.updated_at >= _since
    AND (t.created_by = _uid OR EXISTS (SELECT 1 FROM task_collaborators c WHERE c.task_id = t.id AND c.user_id = _uid AND c.approval_status = 'approved'))
  UNION ALL SELECT 'poll', p.id, p.updated_at FROM polls p WHERE _action = 'complete' AND _kind = 'poll' AND p.status <> 'active' AND p.status <> 'open' AND p.created_by = _uid AND p.updated_at >= _since
  UNION ALL SELECT 'task', c.task_id, c.created_at FROM task_collaborators c JOIN tasks t ON t.id = c.task_id WHERE _action = 'participate' AND coalesce(_kind,'task') = 'task' AND c.user_id = _uid AND t.created_by <> _uid AND c.created_at >= _since
  UNION ALL SELECT 'task', a.task_id, a.created_at FROM task_attendees a WHERE _action = 'participate' AND coalesce(_kind,'task') = 'task' AND a.user_id = _uid AND a.created_at >= _since
  UNION ALL SELECT 'product', pp.product_id, pp.created_at FROM product_participants pp JOIN products p ON p.id = pp.product_id WHERE _action = 'participate' AND coalesce(_kind,'product') = 'product' AND pp.user_id = _uid AND p.created_by <> _uid AND pp.created_at >= _since
  UNION ALL SELECT 'poll', v.poll_id, v.created_at FROM poll_votes v JOIN polls p ON p.id = v.poll_id WHERE _action IN ('participate','vote') AND coalesce(_kind,'poll') = 'poll' AND v.user_id = _uid AND v.created_at >= _since
  UNION ALL SELECT 'task', v.task_id, v.created_at FROM task_votes v WHERE _action = 'vote' AND coalesce(_kind,'task') = 'task' AND v.user_id = _uid AND v.created_at >= _since
  UNION ALL SELECT 'task', a.task_id, a.checked_in_at FROM task_attendees a WHERE _action = 'checkin' AND a.user_id = _uid AND a.checked_in_at >= _since
  UNION ALL SELECT 'task', c.task_id, c.created_at FROM task_comments c WHERE _action = 'comment' AND coalesce(_kind,'task') = 'task' AND c.user_id = _uid AND c.created_at >= _since
  UNION ALL SELECT 'product', c.product_id, c.created_at FROM product_comments c WHERE _action = 'comment' AND coalesce(_kind,'product') = 'product' AND c.user_id = _uid AND c.created_at >= _since
  UNION ALL SELECT 'poll', c.poll_id, c.created_at FROM poll_comments c WHERE _action = 'comment' AND coalesce(_kind,'poll') = 'poll' AND c.user_id = _uid AND c.created_at >= _since
  UNION ALL SELECT 'task', r.task_id, r.created_at FROM task_ratings r WHERE _action = 'rate' AND coalesce(_kind,'task') = 'task' AND r.rater_user_id = _uid AND r.created_at >= _since
  UNION ALL SELECT 'product', r.product_id, r.created_at FROM product_ratings r WHERE _action = 'rate' AND coalesce(_kind,'product') = 'product' AND r.rater_user_id = _uid AND r.created_at >= _since
  UNION ALL SELECT 'task', l.task_id, l.created_at FROM task_likes l WHERE _action = 'like' AND coalesce(_kind,'task') = 'task' AND l.user_id = _uid AND l.like_type = 'like' AND l.created_at >= _since
  UNION ALL SELECT 'product', l.product_id, l.created_at FROM product_likes l WHERE _action = 'like' AND coalesce(_kind,'product') = 'product' AND l.user_id = _uid AND l.like_type = 'like' AND l.created_at >= _since
  UNION ALL SELECT 'poll', l.poll_id, l.created_at FROM poll_likes l WHERE _action = 'like' AND coalesce(_kind,'poll') = 'poll' AND l.user_id = _uid AND l.like_type = 'like' AND l.created_at >= _since
  UNION ALL SELECT 'tag', ut.tag_id, coalesce(ut.created_at, now()) FROM user_tags ut WHERE _action = 'follow_tag' AND ut.user_id = _uid AND coalesce(ut.created_at, now()) >= _since
  UNION ALL SELECT 'person', f.following_id, coalesce(f.created_at, now()) FROM follows f WHERE _action = 'follow_person' AND f.follower_id = _uid AND coalesce(f.created_at, now()) >= _since
$$;

CREATE OR REPLACE FUNCTION public.journey_entity_tags(_kind text, _id uuid)
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE _kind
    WHEN 'task' THEN (SELECT coalesce(array_agg(tag_id), '{}') FROM task_tags WHERE task_id = _id)
    WHEN 'product' THEN (SELECT coalesce(array_agg(tag_id), '{}') FROM product_tags WHERE product_id = _id)
    WHEN 'poll' THEN (SELECT coalesce(array_agg(tag_id), '{}') FROM poll_tags WHERE poll_id = _id)
    WHEN 'tag' THEN ARRAY[_id]
    ELSE '{}'::uuid[] END;
$$;

CREATE OR REPLACE FUNCTION public.journey_entity_metric(_kind text, _id uuid, _metric text)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(CASE
    WHEN _kind = 'task' AND _metric = 'comments' THEN (SELECT count(*) FROM task_comments WHERE task_id = _id)
    WHEN _kind = 'product' AND _metric = 'comments' THEN (SELECT count(*) FROM product_comments WHERE product_id = _id)
    WHEN _kind = 'poll' AND _metric = 'comments' THEN (SELECT count(*) FROM poll_comments WHERE poll_id = _id)
    WHEN _kind = 'task' AND _metric = 'participants' THEN (SELECT count(*) FROM task_collaborators WHERE task_id = _id AND approval_status = 'approved')
    WHEN _kind = 'product' AND _metric = 'participants' THEN (SELECT count(*) FROM product_participants WHERE product_id = _id)
    WHEN _kind = 'poll' AND _metric = 'participants' THEN (SELECT count(DISTINCT user_id) FROM poll_votes WHERE poll_id = _id)
    WHEN _kind = 'task' AND _metric = 'likes' THEN (SELECT coalesce(likes,0) + coalesce(upvotes,0) FROM tasks WHERE id = _id)
    WHEN _kind = 'product' AND _metric = 'likes' THEN (SELECT coalesce(upvotes,0) FROM products WHERE id = _id)
    WHEN _kind = 'poll' AND _metric = 'likes' THEN (SELECT coalesce(upvotes,0) FROM polls WHERE id = _id)
    WHEN _kind = 'task' AND _metric = 'downvotes' THEN (SELECT coalesce(dislikes,0) + coalesce(downvotes,0) FROM tasks WHERE id = _id)
    WHEN _kind = 'product' AND _metric = 'downvotes' THEN (SELECT coalesce(downvotes,0) FROM products WHERE id = _id)
    WHEN _kind = 'poll' AND _metric = 'downvotes' THEN (SELECT coalesce(downvotes,0) FROM polls WHERE id = _id)
    WHEN _metric = 'reports' THEN (SELECT count(*) FROM reports WHERE entity_id = _id)
    WHEN _kind = 'task' AND _metric = 'ratings' THEN (SELECT count(*) FROM task_ratings WHERE task_id = _id)
    WHEN _kind = 'product' AND _metric = 'ratings' THEN (SELECT count(*) FROM product_ratings WHERE product_id = _id)
    WHEN _kind = 'task' AND _metric = 'avg_rating' THEN (SELECT avg(rating) FROM task_ratings WHERE task_id = _id)
    WHEN _kind = 'product' AND _metric = 'avg_rating' THEN (SELECT avg(rating) FROM product_ratings WHERE product_id = _id)
    WHEN _kind = 'task' AND _metric = 'proofs' THEN (SELECT count(*) FROM task_completion_proofs WHERE task_id = _id)
    ELSE 0 END, 0)::numeric;
$$;

CREATE OR REPLACE FUNCTION public.journey_step_matches(_s public.journey_steps, _kind text, _id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _tags uuid[];
  _ind jsonb;
  _v numeric;
  _target numeric;
BEGIN
  IF _s.item_kind IS NOT NULL AND _s.item_kind <> _kind THEN RETURN false; END IF;
  IF _s.entity_id IS NOT NULL AND _s.entity_id <> _id THEN RETURN false; END IF;
  IF _kind = 'task' AND (_s.item_type IS NOT NULL OR _s.item_subtype IS NOT NULL) THEN
    IF NOT EXISTS (SELECT 1 FROM tasks WHERE id = _id
      AND (_s.item_type IS NULL OR task_type::text = _s.item_type)
      AND (_s.item_subtype IS NULL OR task_subtype = _s.item_subtype)) THEN RETURN false; END IF;
  ELSIF _kind = 'product' AND _s.item_type IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE id = _id AND product_type = _s.item_type) THEN RETURN false; END IF;
  ELSIF _kind = 'poll' AND _s.item_type IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM polls WHERE id = _id AND opinions_only = (_s.item_type = 'opinion')) THEN RETURN false; END IF;
  ELSIF _kind = 'tag' AND _s.tag_category IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM tags WHERE id = _id AND category::text = _s.tag_category) THEN RETURN false; END IF;
  END IF;
  IF coalesce(array_length(_s.tag_ids, 1), 0) > 0 THEN
    _tags := public.journey_entity_tags(_kind, _id);
    IF _s.tag_match = 'all' THEN
      IF NOT (_tags @> _s.tag_ids) THEN RETURN false; END IF;
    ELSE
      IF NOT (_tags && _s.tag_ids) THEN RETURN false; END IF;
    END IF;
  END IF;
  FOR _ind IN SELECT * FROM jsonb_array_elements(coalesce(_s.indicators, '[]'::jsonb)) LOOP
    _v := public.journey_entity_metric(_kind, _id, _ind->>'metric');
    _target := coalesce((_ind->>'value')::numeric, 0);
    IF (_ind->>'op') = 'gt' AND NOT (_v > _target) THEN RETURN false; END IF;
    IF (_ind->>'op') = 'lt' AND NOT (_v < _target) THEN RETURN false; END IF;
    IF (_ind->>'op') = 'eq' AND NOT (_v = _target) THEN RETURN false; END IF;
    IF (_ind->>'op') = 'gte' AND NOT (_v >= _target) THEN RETURN false; END IF;
    IF (_ind->>'op') = 'lte' AND NOT (_v <= _target) THEN RETURN false; END IF;
  END LOOP;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.evaluate_journey_progress(_journey_id uuid)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _p public.journey_participants;
  _j public.journeys;
  _s public.journey_steps;
  _c record;
  _found boolean;
  _done int;
  _total int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO _p FROM journey_participants WHERE journey_id = _journey_id AND user_id = _uid;
  IF NOT FOUND THEN RETURN jsonb_build_object('joined', false); END IF;
  SELECT * INTO _j FROM journeys WHERE id = _journey_id;
  IF _p.status <> 'completed' THEN
    FOR _s IN SELECT * FROM journey_steps WHERE journey_id = _journey_id ORDER BY position, created_at LOOP
      CONTINUE WHEN EXISTS (SELECT 1 FROM journey_step_progress WHERE participant_id = _p.id AND step_id = _s.id);
      _found := false;
      FOR _c IN SELECT * FROM public.journey_candidates(_uid, _p.joined_at, _s.action, _s.item_kind) c ORDER BY c.at LOOP
        CONTINUE WHEN EXISTS (SELECT 1 FROM journey_step_progress WHERE participant_id = _p.id AND entity_id = _c.entity_id AND entity_kind = _c.kind);
        IF public.journey_step_matches(_s, _c.kind, _c.entity_id) THEN
          INSERT INTO journey_step_progress (participant_id, step_id, entity_kind, entity_id)
          VALUES (_p.id, _s.id, _c.kind, _c.entity_id) ON CONFLICT DO NOTHING;
          _found := true;
          EXIT;
        END IF;
      END LOOP;
      EXIT WHEN NOT _found AND _j.is_ordered;
    END LOOP;
  END IF;
  SELECT count(*) INTO _total FROM journey_steps WHERE journey_id = _journey_id;
  SELECT count(*) INTO _done FROM journey_step_progress WHERE participant_id = _p.id;
  IF _p.status <> 'completed' AND _total > 0 AND _done >= _total THEN
    UPDATE journey_participants SET status = 'completed', completed_at = now() WHERE id = _p.id;
    INSERT INTO coin_ledger (event_id, event_type, currency_key, subject_user_id, amount, meta)
    VALUES ('journey:' || _journey_id || ':' || _uid, 'journey_completed', 'JOURNEYS', _uid, 1, jsonb_build_object('journey_id', _journey_id))
    ON CONFLICT (event_id) DO NOTHING;
    INSERT INTO notifications (user_id, type, message) VALUES (_uid, 'journey_completed', 'Você concluiu a jornada "' || _j.title || '"! 🏆');
    IF _j.created_by <> _uid THEN
      INSERT INTO notifications (user_id, type, message) VALUES (_j.created_by, 'journey_completed', 'Alguém concluiu sua jornada "' || _j.title || '"');
    END IF;
    RETURN jsonb_build_object('joined', true, 'done', _done, 'total', _total, 'completed', true, 'just_completed', true);
  END IF;
  RETURN jsonb_build_object('joined', true, 'done', _done, 'total', _total, 'completed', _p.status = 'completed' OR (_total > 0 AND _done >= _total), 'just_completed', false);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.journey_candidates(uuid, timestamptz, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.journey_entity_tags(text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.journey_step_matches(public.journey_steps, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.evaluate_journey_progress(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.evaluate_journey_progress(uuid) TO authenticated;

-- Starter journey
INSERT INTO public.journeys (id, title, description, created_by, tag_ids, is_starter)
VALUES ('00000000-0000-4000-a000-000000000001', 'Primeiros Passos no TaskMates',
  'Sua primeira aventura! Conheça o app cumprindo ações básicas e ganhe um multiplicador de EXP ao concluir.',
  '3bfb3a31-ebd0-4408-842f-0a797ad4cb5d',
  ARRAY['d5711450-1b3d-42ba-96a5-88a01cf723b1','e4880a83-09d9-4a0e-a3a6-cc0dcd5ffc25','3af98b18-3ea2-4352-936a-903e15e694ef']::uuid[], true)
ON CONFLICT DO NOTHING;
INSERT INTO public.journey_steps (journey_id, position, title, action, item_kind, tag_category) VALUES
  ('00000000-0000-4000-a000-000000000001', 1, 'Crie uma tarefa', 'create', 'task', NULL),
  ('00000000-0000-4000-a000-000000000001', 2, 'Crie uma opinião', 'create', 'poll', NULL),
  ('00000000-0000-4000-a000-000000000001', 3, 'Cadastre um produto', 'create', 'product', NULL),
  ('00000000-0000-4000-a000-000000000001', 4, 'Siga uma tag de comunidade', 'follow_tag', 'tag', 'communities'),
  ('00000000-0000-4000-a000-000000000001', 5, 'Siga uma tag de habilidade', 'follow_tag', 'tag', 'skills'),
  ('00000000-0000-4000-a000-000000000001', 6, 'Siga uma pessoa', 'follow_person', 'person', NULL),
  ('00000000-0000-4000-a000-000000000001', 7, 'Participe do item de alguém', 'participate', NULL, NULL),
  ('00000000-0000-4000-a000-000000000001', 8, 'Comente em um item', 'comment', NULL, NULL);

CREATE OR REPLACE FUNCTION public.auto_join_starter_journeys()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.journey_participants (journey_id, user_id, joined_at)
  SELECT id, NEW.id, now() - interval '1 minute' FROM public.journeys WHERE is_starter AND status = 'active'
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_auto_join_starter_journeys AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.auto_join_starter_journeys();

INSERT INTO public.journey_participants (journey_id, user_id, joined_at)
SELECT '00000000-0000-4000-a000-000000000001', p.id, now() FROM public.profiles p
ON CONFLICT DO NOTHING;