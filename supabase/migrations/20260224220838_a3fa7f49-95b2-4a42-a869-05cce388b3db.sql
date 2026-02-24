
-- Community admins table
CREATE TABLE public.community_admins (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tag_id, user_id)
);

ALTER TABLE public.community_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view community admins"
  ON public.community_admins FOR SELECT
  USING (true);

CREATE POLICY "Community admins can add other admins"
  ON public.community_admins FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.community_admins ca
      WHERE ca.tag_id = community_admins.tag_id AND ca.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.tags t
      WHERE t.id = community_admins.tag_id AND t.created_by = auth.uid()
    )
  );

CREATE POLICY "Community admins can remove admins"
  ON public.community_admins FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.community_admins ca
      WHERE ca.tag_id = community_admins.tag_id AND ca.user_id = auth.uid()
    )
  );

-- Community settings table
CREATE TABLE public.community_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE UNIQUE,
  header_image_url text,
  logo_url text,
  logo_emoji text,
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.community_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view non-hidden community settings"
  ON public.community_settings FOR SELECT
  USING (true);

CREATE POLICY "Community admins can update settings"
  ON public.community_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.community_admins ca
      WHERE ca.tag_id = community_settings.tag_id AND ca.user_id = auth.uid()
    )
  );

CREATE POLICY "Community admins can insert settings"
  ON public.community_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.community_admins ca
      WHERE ca.tag_id = community_settings.tag_id AND ca.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.tags t
      WHERE t.id = community_settings.tag_id AND t.created_by = auth.uid()
    )
  );

-- Auto-add tag creator as community admin via trigger
CREATE OR REPLACE FUNCTION public.auto_add_community_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.category = 'communities' AND NEW.created_by IS NOT NULL THEN
    INSERT INTO public.community_admins (tag_id, user_id)
    VALUES (NEW.id, NEW.created_by)
    ON CONFLICT (tag_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_add_community_admin_trigger
AFTER INSERT ON public.tags
FOR EACH ROW
EXECUTE FUNCTION public.auto_add_community_admin();
