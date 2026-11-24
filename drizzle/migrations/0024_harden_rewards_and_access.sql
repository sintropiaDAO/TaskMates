CREATE OR REPLACE FUNCTION public.get_hidden_community_tag_ids()
 RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT cs.tag_id FROM public.community_settings cs
  WHERE cs.is_hidden = true AND auth.uid() IS NOT NULL AND public.can_view_tag(cs.tag_id);
$$;

-- product participants: direct inserts only for owner placeholder rows
DROP POLICY IF EXISTS "Authenticated users can participate" ON public.product_participants;
CREATE POLICY "Owners can add placeholder participation" ON public.product_participants
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id AND quantity = 0
  AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.created_by = auth.uid())
);
REVOKE UPDATE ON public.product_participants FROM authenticated, anon;
GRANT UPDATE (delivery_confirmed, delivery_proof_url, delivery_proof_type) ON public.product_participants TO authenticated;

CREATE OR REPLACE FUNCTION public.confirm_product_delivery(_product_id uuid, _delivery_code_input text DEFAULT NULL::text, _proof_url text DEFAULT NULL::text, _proof_type text DEFAULT NULL::text)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_code text; v_owner uuid; v_all_confirmed boolean; v_count int;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT created_by INTO v_owner FROM public.products WHERE id = _product_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Product not found'; END IF;
  SELECT delivery_code INTO v_code FROM public.product_delivery_codes WHERE product_id = _product_id;

  IF v_user <> v_owner THEN
    IF _delivery_code_input IS NULL OR v_code IS NULL OR v_code IS DISTINCT FROM _delivery_code_input THEN
      RETURN false;
    END IF;
  ELSIF _delivery_code_input IS NOT NULL AND v_code IS DISTINCT FROM _delivery_code_input THEN
    RETURN false;
  END IF;

  UPDATE public.product_participants
  SET delivery_confirmed = true, delivery_proof_url = _proof_url,
      delivery_proof_type = _proof_type, delivery_code_input = _delivery_code_input
  WHERE product_id = _product_id AND user_id = v_user;

  SELECT COUNT(*), bool_and(delivery_code_input IS NOT DISTINCT FROM v_code AND delivery_confirmed)
  INTO v_count, v_all_confirmed
  FROM public.product_participants
  WHERE product_id = _product_id AND user_id <> v_owner;

  IF v_count > 0 AND v_all_confirmed THEN
    UPDATE public.products SET status = 'delivered' WHERE id = _product_id;
    INSERT INTO public.coin_ledger (event_id, event_type, currency_key, subject_user_id, amount, meta)
    VALUES ('SUPPLIED_' || _product_id::text, 'PRODUCT_DELIVERED', 'SUPPLIED', v_owner, 1,
      jsonb_build_object('product_id', _product_id))
    ON CONFLICT (event_id) DO NOTHING;
  END IF;
  RETURN true;
END;
$function$;

-- collaborators cannot self-approve
CREATE OR REPLACE FUNCTION public.guard_collaborator_approval()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_owner uuid; v_auto boolean;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF; -- service/definer paths
  SELECT created_by, (COALESCE(auto_approve_collaborators, true) OR COALESCE(auto_approve_requesters, true))
    INTO v_owner, v_auto FROM public.tasks WHERE id = NEW.task_id;
  IF auth.uid() = v_owner THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.approval_status = 'approved' AND NOT v_auto THEN NEW.approval_status := 'pending'; END IF;
  ELSE
    IF NEW.task_id IS DISTINCT FROM OLD.task_id OR NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.approval_status IS DISTINCT FROM OLD.approval_status THEN
      RAISE EXCEPTION 'Only the task owner can change approval';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_collaborator_approval ON public.task_collaborators;
CREATE TRIGGER guard_collaborator_approval BEFORE INSERT OR UPDATE ON public.task_collaborators
FOR EACH ROW EXECUTE FUNCTION public.guard_collaborator_approval();

-- no self ratings
DROP POLICY IF EXISTS "Authenticated users can create ratings" ON public.task_ratings;
CREATE POLICY "Authenticated users can create ratings" ON public.task_ratings
FOR INSERT TO authenticated WITH CHECK (auth.uid() = rater_user_id AND rated_user_id <> rater_user_id);
DROP POLICY IF EXISTS "Users can update own ratings" ON public.task_ratings;
CREATE POLICY "Users can update own ratings" ON public.task_ratings
FOR UPDATE TO authenticated USING (auth.uid() = rater_user_id) WITH CHECK (auth.uid() = rater_user_id AND rated_user_id <> rater_user_id);
DROP POLICY IF EXISTS "Authenticated users can create product ratings" ON public.product_ratings;
CREATE POLICY "Authenticated users can create product ratings" ON public.product_ratings
FOR INSERT TO authenticated WITH CHECK (auth.uid() = rater_user_id AND rated_user_id <> rater_user_id);
DROP POLICY IF EXISTS "Users can update own product ratings" ON public.product_ratings;
CREATE POLICY "Users can update own product ratings" ON public.product_ratings
FOR UPDATE TO authenticated USING (auth.uid() = rater_user_id) WITH CHECK (auth.uid() = rater_user_id AND rated_user_id <> rater_user_id);

CREATE OR REPLACE FUNCTION public.award_rating_max(_task_id uuid, _rated_user_id uuid)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_user uuid := auth.uid(); v_rating int;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _rated_user_id = v_user THEN RETURN false; END IF;
  SELECT rating INTO v_rating FROM public.task_ratings
  WHERE task_id = _task_id AND rated_user_id = _rated_user_id AND rater_user_id = v_user;
  IF v_rating IS NULL THEN RAISE EXCEPTION 'No matching rating from caller'; END IF;
  IF v_rating <> 5 THEN RETURN false; END IF;
  INSERT INTO public.coin_ledger (event_id, event_type, currency_key, subject_user_id, amount, meta)
  VALUES ('RATING_MAX_' || _task_id::text || '_' || _rated_user_id::text || '_' || v_user::text,
    'RATING_MAX', 'MAX_RATING', _rated_user_id, 1,
    jsonb_build_object('task_id', _task_id, 'rater_id', v_user, 'rating', 5))
  ON CONFLICT (event_id) DO NOTHING;
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.award_task_completed(_task_id uuid)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid(); v_creator uuid; v_status text; v_title text;
  v_created timestamptz; v_proof text; v_is_collab boolean; v_today int;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT created_by, status::text, title, created_at, completion_proof_url
    INTO v_creator, v_status, v_title, v_created, v_proof
  FROM public.tasks WHERE id = _task_id;
  IF v_creator IS NULL THEN RAISE EXCEPTION 'Task not found'; END IF;
  IF v_status <> 'completed' THEN RAISE EXCEPTION 'Task not completed yet'; END IF;

  SELECT EXISTS(SELECT 1 FROM public.task_collaborators
     WHERE task_id = _task_id AND user_id = v_user AND approval_status = 'approved' AND completed_at IS NOT NULL)
  INTO v_is_collab;

  IF v_user = v_creator THEN
    -- self-completed tasks need proof, a minimum age, and a daily cap
    IF v_proof IS NULL AND NOT EXISTS (SELECT 1 FROM public.task_completion_proofs WHERE task_id = _task_id)
       AND NOT EXISTS (SELECT 1 FROM public.task_collaborators WHERE task_id = _task_id AND approval_status = 'approved' AND completed_at IS NOT NULL AND user_id <> v_user) THEN
      RETURN false;
    END IF;
    IF v_created > now() - interval '10 minutes' THEN RETURN false; END IF;
    SELECT count(*) INTO v_today FROM public.coin_ledger
      WHERE subject_user_id = v_user AND event_type = 'TASK_COMPLETED' AND created_at > now() - interval '1 day';
    IF v_today >= 10 THEN RETURN false; END IF;
  ELSIF NOT v_is_collab THEN
    RAISE EXCEPTION 'Caller did not participate in this task';
  END IF;

  INSERT INTO public.coin_ledger (event_id, event_type, currency_key, subject_user_id, amount, meta)
  VALUES ('TASK_COMPLETED_' || _task_id::text || '_' || v_user::text, 'TASK_COMPLETED', 'TASKS', v_user, 1,
    jsonb_build_object('task_id', _task_id, 'task_title', v_title))
  ON CONFLICT (event_id) DO NOTHING;
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_available_stars(_user_id uuid)
 RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT CASE WHEN auth.uid() IS NULL OR auth.uid() <> _user_id THEN 0::bigint ELSE
    (SELECT COALESCE(SUM(amount), 0)::bigint FROM public.coin_ledger
     WHERE subject_user_id = _user_id AND currency_key = 'LUCKY_STARS'
       AND created_at > now() - interval '30 days') END;
$$;

CREATE OR REPLACE FUNCTION public.use_stars_for_highlight(_task_id uuid DEFAULT NULL::uuid, _product_id uuid DEFAULT NULL::uuid, _poll_id uuid DEFAULT NULL::uuid, _cost integer DEFAULT 1)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_user_id uuid := auth.uid(); v_available bigint; v_highlight_id uuid; v_event_id text; v_target_id text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _cost IS NULL OR _cost < 1 OR _cost > 100 THEN RAISE EXCEPTION 'Invalid cost'; END IF;
  IF _task_id IS NULL AND _product_id IS NULL AND _poll_id IS NULL THEN
    RAISE EXCEPTION 'Must provide either task_id, product_id, or poll_id';
  END IF;
  v_target_id := COALESCE(_task_id::text, _product_id::text, _poll_id::text);
  SELECT public.get_available_stars(v_user_id) INTO v_available;
  IF v_available < _cost THEN
    RAISE EXCEPTION 'Insufficient stars. Available: %, Required: %', v_available, _cost;
  END IF;
  v_event_id := 'STAR_USED_' || v_target_id || '_' || v_user_id || '_' || extract(epoch from now())::text;
  INSERT INTO public.coin_ledger (event_id, event_type, currency_key, subject_user_id, amount, meta)
  VALUES (v_event_id, 'STAR_USED', 'LUCKY_STARS', v_user_id, -_cost,
    jsonb_build_object('task_id', _task_id, 'product_id', _product_id, 'poll_id', _poll_id, 'cost', _cost));
  INSERT INTO public.task_highlights (task_id, product_id, poll_id, user_id, stars_spent, highlight_expires_at)
  VALUES (_task_id, _product_id, _poll_id, v_user_id, _cost, now() + interval '7 days')
  RETURNING id INTO v_highlight_id;
  RETURN v_highlight_id;
END;
$function$;

-- entity group chat membership
CREATE OR REPLACE FUNCTION public.is_entity_member(_entity_type text, _entity_id uuid, _user uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT CASE _entity_type
    WHEN 'task' THEN EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = _entity_id AND t.created_by = _user)
      OR EXISTS (SELECT 1 FROM public.task_collaborators tc WHERE tc.task_id = _entity_id AND tc.user_id = _user)
    WHEN 'product' THEN EXISTS (SELECT 1 FROM public.products p WHERE p.id = _entity_id AND p.created_by = _user)
      OR EXISTS (SELECT 1 FROM public.product_participants pp WHERE pp.product_id = _entity_id AND pp.user_id = _user)
    WHEN 'poll' THEN EXISTS (SELECT 1 FROM public.polls p WHERE p.id = _entity_id AND p.created_by = _user)
      OR EXISTS (SELECT 1 FROM public.poll_votes v WHERE v.poll_id = _entity_id AND v.user_id = _user)
      OR EXISTS (SELECT 1 FROM public.poll_comments c WHERE c.poll_id = _entity_id AND c.user_id = _user)
    ELSE false END;
$$;
REVOKE EXECUTE ON FUNCTION public.is_entity_member(text, uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_or_create_entity_conversation(_entity_type text, _entity_id uuid, _name text, _member_ids uuid[])
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE _actor uuid := auth.uid(); _conv_id uuid; _members uuid[];
BEGIN
  IF _actor IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _entity_type NOT IN ('task', 'product', 'poll', 'tag') THEN RAISE EXCEPTION 'Invalid entity type'; END IF;

  IF _entity_type = 'tag' THEN
    IF NOT public.can_view_tag(_entity_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
    -- other members must follow the community tag
    SELECT array_agg(DISTINCT m) INTO _members FROM (
      SELECT _actor AS m
      UNION SELECT ut.user_id FROM public.user_tags ut
        WHERE ut.tag_id = _entity_id AND ut.user_id = ANY(_member_ids)
    ) s;
  ELSE
    IF NOT public.is_entity_member(_entity_type, _entity_id, _actor) THEN
      RAISE EXCEPTION 'You are not part of this group';
    END IF;
    SELECT array_agg(DISTINCT m) INTO _members
    FROM unnest(_member_ids || ARRAY[_actor]) AS m
    WHERE m IS NOT NULL AND public.is_entity_member(_entity_type, _entity_id, m);
  END IF;

  IF _members IS NULL OR array_length(_members, 1) < 2 THEN
    RAISE EXCEPTION 'A group chat needs at least two people';
  END IF;

  SELECT id INTO _conv_id FROM public.conversations WHERE entity_type = _entity_type AND entity_id = _entity_id;
  IF _conv_id IS NULL THEN
    INSERT INTO public.conversations (type, name, entity_type, entity_id, task_id)
    VALUES (CASE WHEN _entity_type = 'task' THEN 'task' ELSE 'group' END, _name, _entity_type, _entity_id,
      CASE WHEN _entity_type = 'task' THEN _entity_id ELSE NULL END)
    RETURNING id INTO _conv_id;
  ELSIF _name IS NOT NULL THEN
    UPDATE public.conversations SET name = _name WHERE id = _conv_id AND name IS DISTINCT FROM _name;
  END IF;

  INSERT INTO public.conversation_participants (conversation_id, user_id)
  SELECT _conv_id, m FROM unnest(_members) AS m
  WHERE NOT EXISTS (SELECT 1 FROM public.conversation_participants p WHERE p.conversation_id = _conv_id AND p.user_id = m);
  RETURN _conv_id;
END;
$function$;