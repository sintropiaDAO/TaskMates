-- 1) Revoke column-level SELECT on delivery_code from anon/authenticated
REVOKE SELECT (delivery_code) ON public.products FROM anon, authenticated;

-- 2) Function to fetch delivery code (owner only)
CREATE OR REPLACE FUNCTION public.get_product_delivery_code(_product_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_owner uuid;
BEGIN
  SELECT delivery_code, created_by INTO v_code, v_owner
  FROM public.products WHERE id = _product_id;

  IF v_owner IS NULL THEN
    RETURN NULL;
  END IF;

  IF auth.uid() IS NULL OR auth.uid() <> v_owner THEN
    RAISE EXCEPTION 'Not authorized to view delivery code';
  END IF;

  RETURN v_code;
END;
$$;

REVOKE ALL ON FUNCTION public.get_product_delivery_code(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_product_delivery_code(uuid) TO authenticated;

-- 3) Server-side delivery confirmation that validates the code without exposing it
CREATE OR REPLACE FUNCTION public.confirm_product_delivery(
  _product_id uuid,
  _delivery_code_input text DEFAULT NULL,
  _proof_url text DEFAULT NULL,
  _proof_type text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_code text;
  v_owner uuid;
  v_all_confirmed boolean;
  v_count int;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT delivery_code, created_by INTO v_code, v_owner
  FROM public.products WHERE id = _product_id;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  -- Verify code if provided
  IF _delivery_code_input IS NOT NULL AND v_code IS DISTINCT FROM _delivery_code_input THEN
    RETURN false;
  END IF;

  UPDATE public.product_participants
  SET delivery_confirmed = true,
      delivery_proof_url = _proof_url,
      delivery_proof_type = _proof_type,
      delivery_code_input = _delivery_code_input
  WHERE product_id = _product_id AND user_id = v_user;

  -- Check if all non-owner participants confirmed
  SELECT COUNT(*), bool_and(delivery_confirmed)
  INTO v_count, v_all_confirmed
  FROM public.product_participants
  WHERE product_id = _product_id AND user_id <> v_owner;

  IF v_count > 0 AND v_all_confirmed THEN
    UPDATE public.products SET status = 'delivered' WHERE id = _product_id;

    INSERT INTO public.coin_ledger (event_id, event_type, currency_key, subject_user_id, amount, meta)
    VALUES (
      'SUPPLIED_' || _product_id::text,
      'PRODUCT_DELIVERED',
      'SUPPLIED',
      v_owner,
      1,
      jsonb_build_object('product_id', _product_id)
    )
    ON CONFLICT (event_id) DO NOTHING;
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_product_delivery(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_product_delivery(uuid, text, text, text) TO authenticated;