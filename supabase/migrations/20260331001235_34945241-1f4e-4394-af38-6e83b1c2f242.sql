
CREATE OR REPLACE FUNCTION public.assign_default_tags_to_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  default_tag RECORD;
BEGIN
  FOR default_tag IN
    SELECT id FROM public.tags
    WHERE name IN ('Self-Care', 'Mutual Aid', 'Environmental Preservation')
  LOOP
    INSERT INTO public.user_tags (user_id, tag_id)
    VALUES (NEW.id, default_tag.id)
    ON CONFLICT DO NOTHING;
  END LOOP;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_default_tags ON public.profiles;
CREATE TRIGGER trg_assign_default_tags
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_default_tags_to_new_user();
