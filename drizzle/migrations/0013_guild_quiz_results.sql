CREATE TABLE public.guild_quiz_results (
  user_id uuid PRIMARY KEY,
  primary_category text NOT NULL,
  secondary_category text,
  target_tag_id uuid,
  journey_id uuid REFERENCES public.journeys(id) ON DELETE SET NULL,
  title_form text NOT NULL DEFAULT 'neutral' CHECK (title_form IN ('neutral','masculine','feminine')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guild_quiz_results TO authenticated;
GRANT ALL ON public.guild_quiz_results TO service_role;
ALTER TABLE public.guild_quiz_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own quiz result select" ON public.guild_quiz_results FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own quiz result insert" ON public.guild_quiz_results FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own quiz result update" ON public.guild_quiz_results FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own quiz result delete" ON public.guild_quiz_results FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER guild_quiz_results_updated_at BEFORE UPDATE ON public.guild_quiz_results FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();