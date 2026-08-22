CREATE TABLE IF NOT EXISTS public.link_previews (
  url text PRIMARY KEY,
  title text,
  description text,
  image_url text,
  site_name text,
  status text NOT NULL DEFAULT 'ok',
  fetched_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.link_previews TO anon;
GRANT SELECT ON public.link_previews TO authenticated;
GRANT ALL ON public.link_previews TO service_role;

ALTER TABLE public.link_previews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cached link previews"
ON public.link_previews FOR SELECT
TO anon, authenticated
USING (true);