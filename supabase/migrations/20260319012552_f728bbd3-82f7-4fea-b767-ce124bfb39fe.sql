
-- Coin Ledger: idempotent event log for all gamification events
CREATE TABLE public.coin_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE, -- idempotency key
  event_type text NOT NULL, -- TASK_COMPLETED, COMMENT_LIKED, COMMENT_DISLIKED, SOLICITATION_RECEIVED, SOLICITATION_REMOVED, RATING_MAX, REPORT_RECEIVED, LUCKY_STAR
  currency_key text NOT NULL, -- TASKS, LIKES, SOLICITATIONS, MAX_RATING, LUCKY_STARS
  subject_user_id uuid NOT NULL, -- who receives credit/debit
  amount integer NOT NULL, -- positive or negative
  meta jsonb DEFAULT '{}'::jsonb, -- audit data (task_id, comment_id, roll info, etc.)
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for fast aggregation
CREATE INDEX idx_coin_ledger_subject ON public.coin_ledger (subject_user_id, currency_key);
CREATE INDEX idx_coin_ledger_currency ON public.coin_ledger (currency_key);
CREATE INDEX idx_coin_ledger_event_type ON public.coin_ledger (event_type);

-- Task highlights: when a user uses stars to highlight a task
CREATE TABLE public.task_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  stars_spent integer NOT NULL DEFAULT 1,
  highlight_expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_highlights_task ON public.task_highlights (task_id);
CREATE INDEX idx_task_highlights_expires ON public.task_highlights (highlight_expires_at);

-- RLS for coin_ledger
ALTER TABLE public.coin_ledger ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read ledger (for dashboards)
CREATE POLICY "Authenticated users can view coin_ledger"
  ON public.coin_ledger FOR SELECT TO authenticated
  USING (true);

-- Only service role / edge functions insert (via SECURITY DEFINER functions)
CREATE POLICY "Service role can manage coin_ledger"
  ON public.coin_ledger FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- RLS for task_highlights
ALTER TABLE public.task_highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view task_highlights"
  ON public.task_highlights FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert highlights"
  ON public.task_highlights FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- SECURITY DEFINER function to record ledger entries idempotently
CREATE OR REPLACE FUNCTION public.record_coin_event(
  _event_id text,
  _event_type text,
  _currency_key text,
  _subject_user_id uuid,
  _amount integer,
  _meta jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.coin_ledger (event_id, event_type, currency_key, subject_user_id, amount, meta)
  VALUES (_event_id, _event_type, _currency_key, _subject_user_id, _amount, _meta)
  ON CONFLICT (event_id) DO NOTHING;
  
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_coin_event(text, text, text, uuid, integer, jsonb) TO authenticated;

-- Function to get user coin balances
CREATE OR REPLACE FUNCTION public.get_user_coin_balances(_user_id uuid)
RETURNS TABLE(currency_key text, balance bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT currency_key, COALESCE(SUM(amount), 0)::bigint AS balance
  FROM public.coin_ledger
  WHERE subject_user_id = _user_id
    AND (currency_key != 'LUCKY_STARS' OR created_at > now() - interval '30 days')
  GROUP BY currency_key;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_coin_balances(uuid) TO authenticated;

-- Function to get global coin balances (for LIKES and MAX_RATING)
CREATE OR REPLACE FUNCTION public.get_global_coin_balances()
RETURNS TABLE(currency_key text, balance bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT currency_key, COALESCE(SUM(amount), 0)::bigint AS balance
  FROM public.coin_ledger
  WHERE currency_key IN ('LIKES', 'MAX_RATING')
  GROUP BY currency_key;
$$;

GRANT EXECUTE ON FUNCTION public.get_global_coin_balances() TO authenticated;

-- Function to get available lucky stars (within TTL)
CREATE OR REPLACE FUNCTION public.get_available_stars(_user_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0)::bigint
  FROM public.coin_ledger
  WHERE subject_user_id = _user_id
    AND currency_key = 'LUCKY_STARS'
    AND created_at > now() - interval '30 days';
$$;

GRANT EXECUTE ON FUNCTION public.get_available_stars(uuid) TO authenticated;

-- Function to use stars for highlighting a task
CREATE OR REPLACE FUNCTION public.use_stars_for_highlight(
  _task_id uuid,
  _cost integer DEFAULT 1
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_available bigint;
  v_highlight_id uuid;
  v_event_id text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check available stars
  SELECT public.get_available_stars(v_user_id) INTO v_available;
  IF v_available < _cost THEN
    RAISE EXCEPTION 'Insufficient stars. Available: %, Required: %', v_available, _cost;
  END IF;

  -- Debit stars
  v_event_id := 'STAR_USED_' || _task_id || '_' || v_user_id || '_' || extract(epoch from now())::text;
  INSERT INTO public.coin_ledger (event_id, event_type, currency_key, subject_user_id, amount, meta)
  VALUES (v_event_id, 'STAR_USED', 'LUCKY_STARS', v_user_id, -_cost, 
    jsonb_build_object('task_id', _task_id, 'cost', _cost));

  -- Create highlight (1 week duration)
  INSERT INTO public.task_highlights (task_id, user_id, stars_spent, highlight_expires_at)
  VALUES (_task_id, v_user_id, _cost, now() + interval '7 days')
  RETURNING id INTO v_highlight_id;

  RETURN v_highlight_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.use_stars_for_highlight(uuid, integer) TO authenticated;
