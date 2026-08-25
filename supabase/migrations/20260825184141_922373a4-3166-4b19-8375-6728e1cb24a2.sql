-- 1) Gate per-user coin balances behind ownership or the profile visibility toggle
CREATE OR REPLACE FUNCTION public.get_user_coin_balances(_user_id uuid)
RETURNS TABLE(currency_key text, balance bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT cl.currency_key, COALESCE(SUM(cl.amount), 0)::bigint AS balance
  FROM public.coin_ledger cl
  WHERE cl.subject_user_id = _user_id
    AND (cl.currency_key != 'LUCKY_STARS' OR cl.created_at > now() - interval '30 days')
    AND (
      auth.uid() = _user_id
      OR COALESCE(
        (SELECT psv.show_coins FROM public.profile_section_visibility psv WHERE psv.user_id = _user_id),
        true
      )
    )
  GROUP BY cl.currency_key;
$function$;

-- 2) Move product delivery codes out of the publicly readable products table
CREATE TABLE IF NOT EXISTS public.product_delivery_codes (
  product_id uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  delivery_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.product_delivery_codes TO authenticated;
GRANT ALL ON public.product_delivery_codes TO service_role;
ALTER TABLE public.product_delivery_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can read delivery codes"
ON public.product_delivery_codes FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.created_by = auth.uid()));

CREATE POLICY "Owners can insert delivery codes"
ON public.product_delivery_codes FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.created_by = auth.uid()));

CREATE POLICY "Owners can update delivery codes"
ON public.product_delivery_codes FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.created_by = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.created_by = auth.uid()));

INSERT INTO public.product_delivery_codes (product_id, delivery_code)
SELECT id, delivery_code FROM public.products WHERE delivery_code IS NOT NULL
ON CONFLICT (product_id) DO NOTHING;

ALTER TABLE public.products DROP COLUMN delivery_code;

CREATE OR REPLACE FUNCTION public.get_product_delivery_code(_product_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_code text;
  v_owner uuid;
BEGIN
  SELECT created_by INTO v_owner FROM public.products WHERE id = _product_id;

  IF v_owner IS NULL THEN
    RETURN NULL;
  END IF;

  IF auth.uid() IS NULL OR auth.uid() <> v_owner THEN
    RAISE EXCEPTION 'Not authorized to view delivery code';
  END IF;

  SELECT delivery_code INTO v_code FROM public.product_delivery_codes WHERE product_id = _product_id;

  RETURN v_code;
END;
$function$;

CREATE OR REPLACE FUNCTION public.confirm_product_delivery(_product_id uuid, _delivery_code_input text DEFAULT NULL::text, _proof_url text DEFAULT NULL::text, _proof_type text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  SELECT created_by INTO v_owner
  FROM public.products WHERE id = _product_id;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  SELECT delivery_code INTO v_code
  FROM public.product_delivery_codes WHERE product_id = _product_id;

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
$function$;

-- 3) Move wallet addresses into an owner-only table
CREATE TABLE IF NOT EXISTS public.profile_wallets (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  wallet_address text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_wallets TO authenticated;
GRANT ALL ON public.profile_wallets TO service_role;
ALTER TABLE public.profile_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet"
ON public.profile_wallets FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallet"
ON public.profile_wallets FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wallet"
ON public.profile_wallets FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own wallet"
ON public.profile_wallets FOR DELETE TO authenticated
USING (auth.uid() = user_id);

INSERT INTO public.profile_wallets (user_id, wallet_address)
SELECT id, wallet_address FROM public.profiles WHERE wallet_address IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.profiles DROP COLUMN wallet_address;