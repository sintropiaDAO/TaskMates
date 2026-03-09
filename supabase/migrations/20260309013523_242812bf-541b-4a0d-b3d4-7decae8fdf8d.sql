-- Create poll_history table to track changes
CREATE TABLE public.poll_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL,
  field_changed text,
  old_value text,
  new_value text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.poll_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view poll history"
  ON public.poll_history FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert poll history"
  ON public.poll_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_poll_history_poll_id ON public.poll_history(poll_id);
CREATE INDEX idx_poll_history_created_at ON public.poll_history(created_at DESC);