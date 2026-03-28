
CREATE TABLE public.user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own blocks" ON public.user_blocks
  FOR SELECT TO authenticated
  USING (auth.uid() = blocker_id);

CREATE POLICY "Users can block others" ON public.user_blocks
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = blocker_id AND blocker_id != blocked_id);

CREATE POLICY "Users can unblock" ON public.user_blocks
  FOR DELETE TO authenticated
  USING (auth.uid() = blocker_id);

CREATE OR REPLACE FUNCTION public.is_blocked_by(checker_id uuid, target_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE blocker_id = target_id AND blocked_id = checker_id
  )
$$;
