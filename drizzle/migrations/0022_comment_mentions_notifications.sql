ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS source_comment_id uuid;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS source_comment_kind text;
CREATE UNIQUE INDEX notifications_comment_mention_unique ON public.notifications(user_id,source_comment_kind,source_comment_id) WHERE source_comment_id IS NOT NULL;
CREATE OR REPLACE FUNCTION public.comment_mention_visible_to(_kind text,_id uuid,_viewer uuid) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE owner_id uuid; linked_tags uuid[]; tag_id uuid; visible boolean; any_visible boolean := false; has_community boolean := false; journey_status text;
BEGIN
 IF _viewer IS NULL THEN RETURN false; END IF;
 IF _kind='task' THEN
  SELECT created_by INTO owner_id FROM public.tasks WHERE id=_id;
  SELECT array_agg(t.tag_id) INTO linked_tags FROM public.task_tags t WHERE t.task_id=_id;
 ELSIF _kind='product' THEN
  SELECT created_by INTO owner_id FROM public.products WHERE id=_id;
  SELECT array_agg(t.tag_id) INTO linked_tags FROM public.product_tags t WHERE t.product_id=_id;
 ELSIF _kind='poll' THEN
  SELECT created_by INTO owner_id FROM public.polls WHERE id=_id;
  SELECT array_agg(t.tag_id) INTO linked_tags FROM public.poll_tags t WHERE t.poll_id=_id;
 ELSIF _kind='journey' THEN
  SELECT created_by,tag_ids,status INTO owner_id,linked_tags,journey_status FROM public.journeys WHERE id=_id;
 ELSE RETURN false;
 END IF;
 IF owner_id IS NULL THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM public.user_blocks b WHERE (b.blocker_id=owner_id AND b.blocked_id=_viewer) OR (b.blocker_id=_viewer AND b.blocked_id=owner_id)) THEN RETURN false; END IF;
 IF owner_id=_viewer THEN RETURN true; END IF;
 IF _kind='journey' THEN
  IF EXISTS(SELECT 1 FROM public.journey_participants p WHERE p.journey_id=_id AND p.user_id=_viewer) THEN RETURN true; END IF;
  IF journey_status <> 'active' THEN RETURN false; END IF;
 END IF;
 FOREACH tag_id IN ARRAY COALESCE(linked_tags,ARRAY[]::uuid[]) LOOP
  IF EXISTS(SELECT 1 FROM public.tags t WHERE t.id=tag_id AND t.category='communities') THEN
   has_community := true;
   SELECT EXISTS(SELECT 1 FROM public.tags t WHERE t.id=tag_id AND (
    NOT EXISTS(SELECT 1 FROM public.community_settings s WHERE s.tag_id=t.id AND s.is_hidden)
    OR t.created_by=_viewer
    OR EXISTS(SELECT 1 FROM public.community_admins a WHERE a.tag_id=t.id AND a.user_id=_viewer)
    OR EXISTS(SELECT 1 FROM public.user_tags m WHERE m.tag_id=t.id AND m.user_id=_viewer)
    OR EXISTS(SELECT 1 FROM public.community_invites i WHERE i.tag_id=t.id AND i.invited_user_id=_viewer AND i.status IN ('pending','accepted'))
   )) INTO visible;
   IF _kind='journey' AND NOT visible THEN RETURN false; END IF;
   any_visible := any_visible OR visible;
  END IF;
 END LOOP;
 RETURN _kind='journey' OR NOT has_community OR any_visible;
END;
$$;
REVOKE ALL ON FUNCTION public.comment_mention_visible_to(text,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.comment_mention_visible_to(text,uuid,uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.notify_comment_mentions() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE kind text := TG_ARGV[0]; entity_id uuid; recipient record; actor_name text; msg text;
BEGIN
 IF TG_OP='DELETE' THEN
  DELETE FROM public.notifications WHERE source_comment_kind=kind AND source_comment_id=OLD.id;
  RETURN OLD;
 END IF;
 entity_id := (to_jsonb(NEW)->>(kind||'_id'))::uuid;
 SELECT '@'||username INTO actor_name FROM public.profiles WHERE id=NEW.user_id;
 FOR recipient IN
  SELECT DISTINCT p.id,p.preferred_language FROM regexp_matches(NEW.content,'(^|[^a-zA-Z0-9_@])@([a-zA-Z0-9_]{3,30})(?![a-zA-Z0-9_])','g') m
  JOIN public.profiles p ON lower(p.username)=lower(m[2])
  WHERE p.id<>NEW.user_id
 LOOP
  IF EXISTS(SELECT 1 FROM public.user_blocks b WHERE (b.blocker_id=NEW.user_id AND b.blocked_id=recipient.id) OR (b.blocker_id=recipient.id AND b.blocked_id=NEW.user_id)) THEN CONTINUE; END IF;
  IF NOT public.comment_mention_visible_to(kind,entity_id,recipient.id) THEN CONTINUE; END IF;
  msg := COALESCE(actor_name,'TaskMates') || CASE WHEN recipient.preferred_language='en' THEN ' mentioned you in a comment.' ELSE ' marcou você em um comentário.' END;
  INSERT INTO public.notifications(user_id,type,message,task_id,poll_id,product_id,journey_id,source_comment_id,source_comment_kind)
  VALUES(recipient.id,kind||'_mention',msg,CASE WHEN kind='task' THEN entity_id END,CASE WHEN kind='poll' THEN entity_id END,CASE WHEN kind='product' THEN entity_id END,CASE WHEN kind='journey' THEN entity_id END,NEW.id,kind)
  ON CONFLICT(user_id,source_comment_kind,source_comment_id) WHERE source_comment_id IS NOT NULL DO NOTHING;
 END LOOP;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.notify_comment_mentions() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER task_comment_mentions AFTER INSERT OR DELETE ON public.task_comments FOR EACH ROW EXECUTE FUNCTION public.notify_comment_mentions('task');
CREATE TRIGGER product_comment_mentions AFTER INSERT OR DELETE ON public.product_comments FOR EACH ROW EXECUTE FUNCTION public.notify_comment_mentions('product');
CREATE TRIGGER poll_comment_mentions AFTER INSERT OR DELETE ON public.poll_comments FOR EACH ROW EXECUTE FUNCTION public.notify_comment_mentions('poll');
CREATE TRIGGER journey_comment_mentions AFTER INSERT OR DELETE ON public.journey_comments FOR EACH ROW EXECUTE FUNCTION public.notify_comment_mentions('journey');