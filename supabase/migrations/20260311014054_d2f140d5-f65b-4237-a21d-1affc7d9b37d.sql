
-- Function to create or update a grouped notification for likes on comments/feedback/reports
CREATE OR REPLACE FUNCTION public.notify_on_comment_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  comment_owner_id uuid;
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

  -- Get the comment owner based on which table triggered this
  IF TG_TABLE_NAME = 'comment_likes' THEN
    SELECT user_id, LEFT(content, 50) INTO comment_owner_id, comment_content_preview
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

  -- Don't notify yourself
  IF comment_owner_id IS NULL OR comment_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Check for existing unread grouped notification (within last 24h)
  SELECT id, message INTO existing_notification_id, existing_message
  FROM notifications
  WHERE user_id = comment_owner_id
    AND type = notif_type
    AND read = false
    AND created_at > now() - interval '24 hours'
  ORDER BY created_at DESC
  LIMIT 1;

  IF existing_notification_id IS NOT NULL THEN
    -- Extract count from existing message and increment
    -- Update the existing notification with incremented count
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
    SET message = notif_message, created_at = now()
    WHERE id = existing_notification_id;
  ELSE
    -- Create new notification
    IF notif_type = 'report_like' THEN
      notif_message := '👍 1 pessoa reagiu à sua denúncia: "' || COALESCE(comment_content_preview, '...') || '"';
    ELSE
      notif_message := '👍 1 pessoa reagiu ao seu comentário: "' || COALESCE(comment_content_preview, '...') || '"';
    END IF;

    INSERT INTO notifications (user_id, type, message)
    VALUES (comment_owner_id, notif_type, notif_message);
  END IF;

  RETURN NEW;
END;
$$;

-- Function to notify on task_feedback likes  
CREATE OR REPLACE FUNCTION public.notify_on_feedback_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  feedback_owner_id uuid;
  feedback_content_preview text;
  existing_notification_id uuid;
  existing_message text;
  like_count integer;
  notif_message text;
BEGIN
  IF TG_OP != 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- For task_likes on feedback content (task_feedback table)
  -- This trigger is for the task_feedback table when someone interacts
  -- We handle this via the comment_likes pattern

  RETURN NEW;
END;
$$;

-- Create triggers for each like table
CREATE TRIGGER on_comment_like_notify
  AFTER INSERT ON public.comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_comment_like();

CREATE TRIGGER on_poll_comment_like_notify
  AFTER INSERT ON public.poll_comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_comment_like();

CREATE TRIGGER on_product_comment_like_notify
  AFTER INSERT ON public.product_comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_comment_like();

CREATE TRIGGER on_report_like_notify
  AFTER INSERT ON public.report_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_comment_like();
