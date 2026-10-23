CREATE TABLE public.push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX push_tokens_user_idx ON public.push_tokens(user_id);
GRANT SELECT, DELETE ON public.push_tokens TO authenticated;
GRANT ALL ON public.push_tokens TO service_role;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own push tokens" ON public.push_tokens FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own push tokens" ON public.push_tokens FOR DELETE TO authenticated USING (auth.uid() = user_id);