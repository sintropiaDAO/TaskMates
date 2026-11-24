ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS tag_id uuid REFERENCES public.tags(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS notifications_tag_id_idx ON public.notifications(tag_id);
CREATE OR REPLACE FUNCTION public.notify_admins_on_new_tag()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE admin_record RECORD; creator_name TEXT; category_label TEXT;
BEGIN
  SELECT full_name INTO creator_name FROM public.profiles WHERE id = NEW.created_by;
  CASE NEW.category
    WHEN 'skills' THEN category_label := 'Habilidade';
    WHEN 'communities' THEN category_label := 'Comunidade';
    WHEN 'physical_resources' THEN category_label := 'Recurso Físico';
    ELSE category_label := NEW.category;
  END CASE;
  FOR admin_record IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
    IF admin_record.user_id != COALESCE(NEW.created_by, '00000000-0000-0000-0000-000000000000') THEN
      INSERT INTO public.notifications (user_id, type, message, tag_id)
      VALUES (admin_record.user_id, 'new_tag',
        '🏷️ Nova tag criada: "' || NEW.name || '" (' || category_label || ') por ' || COALESCE(creator_name, 'Anônimo'), NEW.id);
    END IF;
  END LOOP;
  RETURN NEW;
END;
$function$;