-- 1. Allow opinions without any voting options
ALTER TABLE public.polls
  ADD COLUMN IF NOT EXISTS opinions_only boolean NOT NULL DEFAULT false;

-- 2. Multi-question support (additive; existing polls keep options tied to poll_id only)
CREATE TABLE IF NOT EXISTS public.poll_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  label text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.poll_questions TO authenticated;
GRANT SELECT ON public.poll_questions TO anon;
GRANT ALL ON public.poll_questions TO service_role;

ALTER TABLE public.poll_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read poll questions"
  ON public.poll_questions FOR SELECT
  USING (true);

CREATE POLICY "Poll owner can insert questions"
  ON public.poll_questions FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.polls p WHERE p.id = poll_id AND p.created_by = auth.uid()));

CREATE POLICY "Poll owner can update questions"
  ON public.poll_questions FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.polls p WHERE p.id = poll_id AND p.created_by = auth.uid()));

CREATE POLICY "Poll owner can delete questions"
  ON public.poll_questions FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.polls p WHERE p.id = poll_id AND p.created_by = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_poll_questions_poll ON public.poll_questions(poll_id, position);

-- 3. Optionally link options and votes to a specific question (nullable for backward compat)
ALTER TABLE public.poll_options
  ADD COLUMN IF NOT EXISTS question_id uuid REFERENCES public.poll_questions(id) ON DELETE CASCADE;

ALTER TABLE public.poll_votes
  ADD COLUMN IF NOT EXISTS question_id uuid REFERENCES public.poll_questions(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_poll_options_question ON public.poll_options(question_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_question ON public.poll_votes(question_id);