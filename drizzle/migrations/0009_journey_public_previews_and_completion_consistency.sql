CREATE OR REPLACE FUNCTION public.get_public_journey_preview(_journey_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT jsonb_build_object('id',j.id,'title',j.title,'description',j.description,'image_url',j.image_url,'author_name',p.full_name,'author_username',p.username)
 FROM public.journeys j LEFT JOIN public.profiles p ON p.id=j.created_by
 WHERE j.id=_journey_id AND j.status='active'
 AND NOT EXISTS (SELECT 1 FROM unnest(j.tag_ids) AS t(id) WHERE NOT public.can_view_tag(t.id))
 AND NOT EXISTS (SELECT 1 FROM unnest(j.tag_ids) AS t(id) JOIN public.community_settings s ON s.tag_id=t.id WHERE s.is_hidden);
$$;
REVOKE ALL ON FUNCTION public.get_public_journey_preview(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_journey_preview(uuid) TO anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.get_completed_journey_count(_user_id uuid)
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT count(*) FROM public.coin_ledger l WHERE l.subject_user_id=_user_id AND l.currency_key='JOURNEYS' AND l.event_type='journey_completed' AND public.can_view_profile(_user_id);
$$;
REVOKE ALL ON FUNCTION public.get_completed_journey_count(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_completed_journey_count(uuid) TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.evaluate_journey_progress(_journey_id uuid)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
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
   INSERT INTO public.notifications (user_id,type,message) VALUES (_uid,'journey_completed','Você concluiu a jornada "'||_j.title||'"! 🏆');
   IF _j.created_by<>_uid THEN INSERT INTO public.notifications (user_id,type,message) VALUES (_j.created_by,'journey_completed','Alguém concluiu sua jornada "'||_j.title||'"'); END IF;
  END IF;
  RETURN jsonb_build_object('joined',true,'done',_done,'total',_total,'completed',true,'just_completed',_awarded);
 END IF;
 RETURN jsonb_build_object('joined',true,'done',_done,'total',_total,'completed',_p.status='completed','just_completed',false);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.evaluate_journey_progress(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.evaluate_journey_progress(uuid) TO authenticated;