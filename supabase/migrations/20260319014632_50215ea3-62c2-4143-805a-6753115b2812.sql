
-- Add product_id column to task_highlights
ALTER TABLE public.task_highlights 
  ALTER COLUMN task_id DROP NOT NULL,
  ADD COLUMN product_id uuid REFERENCES public.products(id) ON DELETE CASCADE;

-- Add constraint: must have either task_id or product_id
ALTER TABLE public.task_highlights 
  ADD CONSTRAINT highlight_has_target CHECK (task_id IS NOT NULL OR product_id IS NOT NULL);

-- Update the use_stars_for_highlight function to support products
CREATE OR REPLACE FUNCTION public.use_stars_for_highlight(_task_id uuid DEFAULT NULL, _product_id uuid DEFAULT NULL, _cost integer DEFAULT 1)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_available bigint;
  v_highlight_id uuid;
  v_event_id text;
  v_target_id text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _task_id IS NULL AND _product_id IS NULL THEN
    RAISE EXCEPTION 'Must provide either task_id or product_id';
  END IF;

  v_target_id := COALESCE(_task_id::text, _product_id::text);

  SELECT public.get_available_stars(v_user_id) INTO v_available;
  IF v_available < _cost THEN
    RAISE EXCEPTION 'Insufficient stars. Available: %, Required: %', v_available, _cost;
  END IF;

  v_event_id := 'STAR_USED_' || v_target_id || '_' || v_user_id || '_' || extract(epoch from now())::text;
  INSERT INTO public.coin_ledger (event_id, event_type, currency_key, subject_user_id, amount, meta)
  VALUES (v_event_id, 'STAR_USED', 'LUCKY_STARS', v_user_id, -_cost, 
    jsonb_build_object('task_id', _task_id, 'product_id', _product_id, 'cost', _cost));

  INSERT INTO public.task_highlights (task_id, product_id, user_id, stars_spent, highlight_expires_at)
  VALUES (_task_id, _product_id, v_user_id, _cost, now() + interval '7 days')
  RETURNING id INTO v_highlight_id;

  RETURN v_highlight_id;
END;
$$;
