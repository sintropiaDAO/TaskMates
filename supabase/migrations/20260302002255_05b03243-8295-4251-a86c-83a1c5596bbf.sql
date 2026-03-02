
-- Create a trigger function to notify admins when a new tag is created
CREATE OR REPLACE FUNCTION public.notify_admins_on_new_tag()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  admin_record RECORD;
  creator_name TEXT;
  category_label TEXT;
BEGIN
  -- Get creator name
  SELECT full_name INTO creator_name FROM public.profiles WHERE id = NEW.created_by;
  
  -- Determine category label
  CASE NEW.category
    WHEN 'skills' THEN category_label := 'Habilidade';
    WHEN 'communities' THEN category_label := 'Comunidade';
    WHEN 'physical_resources' THEN category_label := 'Recurso Físico';
    ELSE category_label := NEW.category;
  END CASE;
  
  -- Notify all admins
  FOR admin_record IN 
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    -- Don't notify the creator if they are an admin
    IF admin_record.user_id != COALESCE(NEW.created_by, '00000000-0000-0000-0000-000000000000') THEN
      INSERT INTO public.notifications (user_id, type, message)
      VALUES (
        admin_record.user_id,
        'new_tag',
        '🏷️ Nova tag criada: "' || NEW.name || '" (' || category_label || ') por ' || COALESCE(creator_name, 'Anônimo')
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_notify_admins_new_tag ON public.tags;
CREATE TRIGGER trigger_notify_admins_new_tag
  AFTER INSERT ON public.tags
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_on_new_tag();

-- Create tag_correlations table for the smart correlation system
CREATE TABLE IF NOT EXISTS public.tag_correlations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tag_id_1 UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  tag_id_2 UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  correlation_score NUMERIC NOT NULL DEFAULT 0,
  correlation_type TEXT NOT NULL DEFAULT 'co_occurrence',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tag_id_1, tag_id_2)
);

-- RLS for tag_correlations
ALTER TABLE public.tag_correlations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tag correlations"
  ON public.tag_correlations FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage tag correlations"
  ON public.tag_correlations FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
