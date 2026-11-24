ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS poll_id uuid REFERENCES public.polls(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE CASCADE;
CREATE OR REPLACE FUNCTION public.notify_on_comment_like()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  comment_owner_id uuid;
  liked_task_id uuid;
  liked_poll_id uuid;
  liked_product_id uuid;
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
    SELECT user_id, LEFT(content, 50), poll_id INTO comment_owner_id, comment_content_preview, liked_poll_id
    FROM poll_comments WHERE id = NEW.comment_id;
    notif_type := 'comment_like';
  ELSIF TG_TABLE_NAME = 'product_comment_likes' THEN
    SELECT user_id, LEFT(content, 50), product_id INTO comment_owner_id, comment_content_preview, liked_product_id
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
    SET message = notif_message, created_at = now(), task_id = liked_task_id, poll_id = liked_poll_id, product_id = liked_product_id
    WHERE id = existing_notification_id;
  ELSE
    IF notif_type = 'report_like' THEN
      notif_message := '👍 1 pessoa reagiu à sua denúncia: "' || COALESCE(comment_content_preview, '...') || '"';
    ELSE
      notif_message := '👍 1 pessoa reagiu ao seu comentário: "' || COALESCE(comment_content_preview, '...') || '"';
    END IF;
    INSERT INTO notifications (user_id, type, message, task_id, poll_id, product_id)
    VALUES (comment_owner_id, notif_type, notif_message, liked_task_id, liked_poll_id, liked_product_id);
  END IF;
  RETURN NEW;
END;
$function$;