REVOKE SELECT ON public.coin_ledger FROM authenticated;
REVOKE SELECT ON public.coin_ledger FROM anon;
GRANT SELECT (id, event_id, event_type, currency_key, subject_user_id, amount, created_at) ON public.coin_ledger TO authenticated;
GRANT ALL ON public.coin_ledger TO service_role;