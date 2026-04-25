
-- ============================================================
-- Lock down record_coin_event and add owner-validated award RPCs
-- ============================================================

-- 1) Restrict record_coin_event to service_role only (no caller can credit anyone)
CREATE OR REPLACE FUNCTION public.record_coin_event(
  _event_id text,
  _event_type text,
  _currency_key text,
  _subject_user_id uuid,
  _amount integer,
  _meta jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only the service_role (server-side, e.g. edge functions) may call this directly.
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Forbidden: record_coin_event is restricted to service role';
  END IF;

  INSERT INTO public.coin_ledger (event_id, event_type, currency_key, subject_user_id, amount, meta)
  VALUES (_event_id, _event_type, _currency_key, _subject_user_id, _amount, _meta)
  ON CONFLICT (event_id) DO NOTHING;

  RETURN FOUND;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_coin_event(text, text, text, uuid, integer, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_coin_event(text, text, text, uuid, integer, jsonb) TO service_role;

-- ============================================================
-- 2) Owner-validated award functions
-- ============================================================

-- Award TASKS to caller for completing one of their own tasks (self-credit, validated)
CREATE OR REPLACE FUNCTION public.award_task_completed(_task_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_creator uuid;
  v_status text;
  v_is_collab boolean;
  v_title text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT created_by, status::text, title
    INTO v_creator, v_status, v_title
  FROM public.tasks WHERE id = _task_id;

  IF v_creator IS NULL THEN RAISE EXCEPTION 'Task not found'; END IF;
  IF v_status <> 'completed' THEN RAISE EXCEPTION 'Task not completed yet'; END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.task_collaborators
     WHERE task_id = _task_id
       AND user_id = v_user
       AND approval_status = 'approved'
       AND completed_at IS NOT NULL
  ) INTO v_is_collab;

  IF v_user <> v_creator AND NOT v_is_collab THEN
    RAISE EXCEPTION 'Caller did not participate in this task';
  END IF;

  INSERT INTO public.coin_ledger (event_id, event_type, currency_key, subject_user_id, amount, meta)
  VALUES (
    'TASK_COMPLETED_' || _task_id::text || '_' || v_user::text,
    'TASK_COMPLETED', 'TASKS', v_user, 1,
    jsonb_build_object('task_id', _task_id, 'task_title', v_title)
  )
  ON CONFLICT (event_id) DO NOTHING;

  RETURN true;
END;
$$;

-- Award SOLICITATIONS to task owner when caller actually requested participation
CREATE OR REPLACE FUNCTION public.award_solicitation_received(_task_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_owner uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT created_by INTO v_owner FROM public.tasks WHERE id = _task_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Task not found'; END IF;
  IF v_owner = v_user THEN RETURN false; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.task_collaborators
     WHERE task_id = _task_id AND user_id = v_user
  ) THEN
    RAISE EXCEPTION 'Caller has not requested participation';
  END IF;

  INSERT INTO public.coin_ledger (event_id, event_type, currency_key, subject_user_id, amount, meta)
  VALUES (
    'SOLICITATION_RECEIVED_' || _task_id::text || '_' || v_user::text,
    'SOLICITATION_RECEIVED', 'SOLICITATIONS', v_owner, 1,
    jsonb_build_object('task_id', _task_id, 'requester_id', v_user)
  )
  ON CONFLICT (event_id) DO NOTHING;

  RETURN true;
END;
$$;

-- Award MAX_RATING when caller actually gave a 5-star rating
CREATE OR REPLACE FUNCTION public.award_rating_max(_task_id uuid, _rated_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_rating int;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT rating INTO v_rating
  FROM public.task_ratings
  WHERE task_id = _task_id
    AND rated_user_id = _rated_user_id
    AND rater_user_id = v_user;

  IF v_rating IS NULL THEN RAISE EXCEPTION 'No matching rating from caller'; END IF;
  IF v_rating <> 5 THEN RETURN false; END IF;

  INSERT INTO public.coin_ledger (event_id, event_type, currency_key, subject_user_id, amount, meta)
  VALUES (
    'RATING_MAX_' || _task_id::text || '_' || _rated_user_id::text || '_' || v_user::text,
    'RATING_MAX', 'MAX_RATING', _rated_user_id, 1,
    jsonb_build_object('task_id', _task_id, 'rater_id', v_user, 'rating', 5)
  )
  ON CONFLICT (event_id) DO NOTHING;

  RETURN true;
END;
$$;

-- Apply -1 MAX_RATING to entity owner when caller actually filed a report
CREATE OR REPLACE FUNCTION public.award_report_penalty(_entity_type text, _entity_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_owner uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Verify caller has a report for this entity
  IF NOT EXISTS (
    SELECT 1 FROM public.reports
     WHERE entity_type = _entity_type
       AND entity_id = _entity_id
       AND reporter_id = v_user
  ) THEN
    RAISE EXCEPTION 'Caller has no report for this entity';
  END IF;

  -- Resolve owner from entity
  IF _entity_type = 'task' THEN
    SELECT created_by INTO v_owner FROM public.tasks WHERE id = _entity_id;
  ELSIF _entity_type = 'product' THEN
    SELECT created_by INTO v_owner FROM public.products WHERE id = _entity_id;
  ELSIF _entity_type = 'poll' THEN
    SELECT created_by INTO v_owner FROM public.polls WHERE id = _entity_id;
  ELSIF _entity_type = 'user' OR _entity_type = 'profile' THEN
    v_owner := _entity_id;
  ELSIF _entity_type = 'tag' THEN
    SELECT created_by INTO v_owner FROM public.tags WHERE id = _entity_id;
  END IF;

  IF v_owner IS NULL OR v_owner = v_user THEN RETURN false; END IF;

  INSERT INTO public.coin_ledger (event_id, event_type, currency_key, subject_user_id, amount, meta)
  VALUES (
    'REPORT_RECEIVED_' || _entity_type || '_' || _entity_id::text || '_' || v_user::text,
    'REPORT_RECEIVED', 'MAX_RATING', v_owner, -1,
    jsonb_build_object('entity_type', _entity_type, 'entity_id', _entity_id, 'reporter_id', v_user)
  )
  ON CONFLICT (event_id) DO NOTHING;

  RETURN true;
END;
$$;

-- Reconcile LIKES on a comment based on the caller's current like row.
-- This is idempotent: it computes the net LIKES amount the comment owner should
-- have from this caller and writes a single ledger entry (using a stable event_id
-- per (comment, caller, state)) so spam clicks cannot inflate.
CREATE OR REPLACE FUNCTION public.award_comment_like(_comment_id uuid, _comment_kind text DEFAULT 'task')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_owner uuid;
  v_like_type text;
  v_amount int := 0;
  v_event_id text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF _comment_kind = 'task' THEN
    SELECT user_id INTO v_owner FROM public.task_comments WHERE id = _comment_id;
    SELECT like_type INTO v_like_type FROM public.comment_likes
      WHERE comment_id = _comment_id AND user_id = v_user;
  ELSIF _comment_kind = 'poll' THEN
    SELECT user_id INTO v_owner FROM public.poll_comments WHERE id = _comment_id;
    SELECT like_type INTO v_like_type FROM public.poll_comment_likes
      WHERE comment_id = _comment_id AND user_id = v_user;
  ELSIF _comment_kind = 'product' THEN
    SELECT user_id INTO v_owner FROM public.product_comments WHERE id = _comment_id;
    SELECT like_type INTO v_like_type FROM public.product_comment_likes
      WHERE comment_id = _comment_id AND user_id = v_user;
  ELSE
    RAISE EXCEPTION 'Invalid comment kind';
  END IF;

  IF v_owner IS NULL OR v_owner = v_user THEN RETURN false; END IF;

  -- Net amount from this caller's current state
  IF v_like_type = 'like' THEN v_amount := 1;
  ELSIF v_like_type = 'dislike' THEN v_amount := -1;
  ELSE v_amount := 0; END IF;

  -- Remove any previous ledger entries from this caller on this comment, then write the current state
  DELETE FROM public.coin_ledger
   WHERE currency_key = 'LIKES'
     AND event_type IN ('COMMENT_LIKE_NET')
     AND meta->>'comment_id' = _comment_id::text
     AND meta->>'actor_id' = v_user::text;

  IF v_amount <> 0 THEN
    v_event_id := 'COMMENT_LIKE_NET_' || _comment_id::text || '_' || v_user::text || '_' || v_amount::text;
    INSERT INTO public.coin_ledger (event_id, event_type, currency_key, subject_user_id, amount, meta)
    VALUES (
      v_event_id,
      'COMMENT_LIKE_NET',
      'LIKES',
      v_owner,
      v_amount,
      jsonb_build_object('comment_id', _comment_id, 'actor_id', v_user, 'kind', _comment_kind)
    )
    ON CONFLICT (event_id) DO NOTHING;
  END IF;

  RETURN true;
END;
$$;

-- Permissions
REVOKE ALL ON FUNCTION public.award_task_completed(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.award_solicitation_received(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.award_rating_max(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.award_report_penalty(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.award_comment_like(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.award_task_completed(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_solicitation_received(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_rating_max(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_report_penalty(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_comment_like(uuid, text) TO authenticated;
