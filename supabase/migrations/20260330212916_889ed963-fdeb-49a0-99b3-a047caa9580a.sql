
CREATE TABLE public.profile_section_visibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  -- Report sections (default ON)
  show_coins boolean NOT NULL DEFAULT true,
  show_completed_chart boolean NOT NULL DEFAULT true,
  show_ratings boolean NOT NULL DEFAULT true,
  -- My sections (default OFF)
  show_my_action_plan boolean NOT NULL DEFAULT false,
  show_my_demands boolean NOT NULL DEFAULT false,
  show_my_impact boolean NOT NULL DEFAULT false,
  show_my_deliver boolean NOT NULL DEFAULT false,
  show_my_receive boolean NOT NULL DEFAULT false,
  show_my_delivered boolean NOT NULL DEFAULT false,
  show_my_voting boolean NOT NULL DEFAULT false,
  show_my_completed_polls boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_section_visibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view any visibility settings"
  ON public.profile_section_visibility FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own visibility settings"
  ON public.profile_section_visibility FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own visibility settings"
  ON public.profile_section_visibility FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
