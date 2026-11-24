ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS journey_id uuid REFERENCES public.journeys(id) ON DELETE CASCADE;
CREATE OR REPLACE FUNCTION public.evaluate_journey_progress(_journey_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
 _uid uuid := auth.uid(); _p public.journey_participants; _j public.journeys; _s public.journey_steps; _c record;
 _found boolean; _done int; _total int; _awarded boolean;
BEGIN
 IF _uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT * INTO _p FROM public.journey_participants WHERE journey_id=_journey_id AND user_id=_uid FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('joined',false); END IF;
 SELECT * INTO _j FROM public.journeys WHERE id=_journey_id;
 IF NOT public.can_view_journey(_journey_id) THEN RAISE EXCEPTION 'Journey unavailable'; END IF;
 IF _p.status <> 'completed' THEN
  FOR _s IN SELECT * FROM public.journey_steps WHERE journey_id=_journey_id ORDER BY position,created_at LOOP
   CONTINUE WHEN EXISTS (SELECT 1 FROM public.journey_step_progress WHERE participant_id=_p.id AND step_id=_s.id);
   _found := false;
   FOR _c IN SELECT * FROM public.journey_candidates(_uid,_p.joined_at,_s.action,_s.item_kind) c ORDER BY c.at LOOP
    CONTINUE WHEN EXISTS (SELECT 1 FROM public.journey_step_progress WHERE participant_id=_p.id AND entity_id=_c.entity_id AND entity_kind=_c.kind);
    IF public.journey_step_matches(_s,_c.kind,_c.entity_id) THEN
     INSERT INTO public.journey_step_progress (participant_id,step_id,entity_kind,entity_id) VALUES (_p.id,_s.id,_c.kind,_c.entity_id) ON CONFLICT DO NOTHING;
     _found := true; EXIT;
    END IF;
   END LOOP;
   EXIT WHEN NOT _found AND _j.is_ordered;
  END LOOP;
 END IF;
 SELECT count(*) INTO _total FROM public.journey_steps WHERE journey_id=_journey_id;
 SELECT count(*) INTO _done FROM public.journey_step_progress WHERE participant_id=_p.id;
 IF _p.status <> 'completed' AND _total>0 AND _done>=_total THEN
  UPDATE public.journey_participants SET status='completed',completed_at=now() WHERE id=_p.id;
  INSERT INTO public.coin_ledger (event_id,event_type,currency_key,subject_user_id,amount,meta)
  VALUES ('journey:'||_journey_id||':'||_uid,'journey_completed','JOURNEYS',_uid,1,jsonb_build_object('journey_id',_journey_id)) ON CONFLICT (event_id) DO NOTHING;
  _awarded := FOUND;
  IF _awarded THEN
   INSERT INTO public.notifications (user_id,type,message,journey_id) VALUES (_uid,'journey_completed','Você concluiu a jornada "'||_j.title||'"! 🏆',_j.id);
   IF _j.created_by<>_uid THEN INSERT INTO public.notifications (user_id,type,message,journey_id) VALUES (_j.created_by,'journey_completed','Alguém concluiu sua jornada "'||_j.title||'"',_j.id); END IF;
  END IF;
  RETURN jsonb_build_object('joined',true,'done',_done,'total',_total,'completed',true,'just_completed',_awarded);
 END IF;
 RETURN jsonb_build_object('joined',true,'done',_done,'total',_total,'completed',_p.status='completed','just_completed',false);
END;
$function$;
CREATE OR REPLACE FUNCTION public.notify_on_comment_like()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  comment_owner_id uuid;
  liked_task_id uuid;
  comment_content_preview text;
  existing_notification_id uuid;
  existing_message text;
  like_count integer;
  notif_type text;
  notif_message text;
BEGIN
  IF TG_OP != 'INSERT' THEN
    RETURN NEW;
  END IF;
  IF TG_TABLE_NAME = 'comment_likes' THEN
    SELECT user_id, LEFT(content, 50), task_id INTO comment_owner_id, comment_content_preview, liked_task_id
    FROM task_comments WHERE id = NEW.comment_id;
    notif_type := 'comment_like';
  ELSIF TG_TABLE_NAME = 'poll_comment_likes' THEN
    SELECT user_id, LEFT(content, 50) INTO comment_owner_id, comment_content_preview
    FROM poll_comments WHERE id = NEW.comment_id;
    notif_type := 'comment_like';
  ELSIF TG_TABLE_NAME = 'product_comment_likes' THEN
    SELECT user_id, LEFT(content, 50) INTO comment_owner_id, comment_content_preview
    FROM product_comments WHERE id = NEW.comment_id;
    notif_type := 'comment_like';
  ELSIF TG_TABLE_NAME = 'report_likes' THEN
    SELECT reporter_id, LEFT(comment, 50) INTO comment_owner_id, comment_content_preview
    FROM reports WHERE id = NEW.report_id;
    notif_type := 'report_like';
  END IF;
  IF comment_owner_id IS NULL OR comment_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  SELECT id, message INTO existing_notification_id, existing_message
  FROM notifications
  WHERE user_id = comment_owner_id
    AND type = notif_type
    AND read = false
    AND created_at > now() - interval '24 hours'
  ORDER BY created_at DESC
  LIMIT 1;
  IF existing_notification_id IS NOT NULL THEN
    like_count := COALESCE(
      (regexp_match(existing_message, '(\d+) pessoa'))[1]::integer,
      1
    ) + 1;
    IF notif_type = 'report_like' THEN
      notif_message := '👍 ' || like_count || ' pessoas reagiram à sua denúncia: "' || COALESCE(comment_content_preview, '...') || '"';
    ELSE
      notif_message := '👍 ' || like_count || ' pessoas reagiram ao seu comentário: "' || COALESCE(comment_content_preview, '...') || '"';
    END IF;
    UPDATE notifications
    SET message = notif_message, created_at = now(), task_id = COALESCE(liked_task_id, task_id)
    WHERE id = existing_notification_id;
  ELSE
    IF notif_type = 'report_like' THEN
      notif_message := '👍 1 pessoa reagiu à sua denúncia: "' || COALESCE(comment_content_preview, '...') || '"';
    ELSE
      notif_message := '👍 1 pessoa reagiu ao seu comentário: "' || COALESCE(comment_content_preview, '...') || '"';
    END IF;
    INSERT INTO notifications (user_id, type, message, task_id)
    VALUES (comment_owner_id, notif_type, notif_message, liked_task_id);
  END IF;
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.notify_community_invite(_user_id uuid, _tag_id uuid, _message text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $f$
DECLARE _id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.community_invites WHERE tag_id=_tag_id AND invited_user_id=_user_id AND invited_by=auth.uid()) THEN
    RAISE EXCEPTION 'No matching invite';
  END IF;
  INSERT INTO public.notifications (user_id, type, message, tag_id) VALUES (_user_id, 'community_invite', left(_message, 300), _tag_id) RETURNING id INTO _id;
  RETURN _id;
END; $f$;
REVOKE ALL ON FUNCTION public.notify_community_invite(uuid,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notify_community_invite(uuid,uuid,text) TO authenticated;