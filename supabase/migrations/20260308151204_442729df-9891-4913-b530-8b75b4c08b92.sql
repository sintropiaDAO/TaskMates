
CREATE TABLE public.section_visits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  section_key text NOT NULL,
  last_visited_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, section_key)
);

ALTER TABLE public.section_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own section visits"
  ON public.section_visits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own section visits"
  ON public.section_visits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own section visits"
  ON public.section_visits FOR UPDATE
  USING (auth.uid() = user_id);
