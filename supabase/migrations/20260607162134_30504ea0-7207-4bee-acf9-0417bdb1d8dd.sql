
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT ALL ON public.app_settings TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app settings" ON public.app_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert app settings" ON public.app_settings
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update app settings" ON public.app_settings
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete app settings" ON public.app_settings
  FOR DELETE TO authenticated USING (public.is_admin());

INSERT INTO public.app_settings (key, value) VALUES ('capy_vera_enabled', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;
