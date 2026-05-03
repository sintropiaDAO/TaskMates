
-- Revoke EXECUTE from anon/authenticated/PUBLIC on trigger-only and internal helper functions.
-- These are invoked by triggers or by SECURITY DEFINER wrappers, never directly by clients.

DO $$
DECLARE
  fn text;
  internal_fns text[] := ARRAY[
    'update_updated_at_column()',
    'handle_new_user()',
    'auto_add_community_admin()',
    'notify_admins_on_new_tag()',
    'sync_product_stock_status()',
    'update_product_like_counts()',
    'update_task_like_counts()',
    'update_poll_like_counts()',
    'update_task_vote_counts()',
    'check_vouch_threshold()',
    'assign_default_tags_to_new_user()',
    'notify_on_feedback_like()',
    'notify_on_comment_like()',
    'generate_random_username()',
    'record_coin_event(text,text,text,uuid,integer,jsonb)',
    'create_notification(uuid,uuid,text,text)'
  ];
BEGIN
  FOREACH fn IN ARRAY internal_fns LOOP
    BEGIN
      EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'Function %s not found, skipping', fn;
    END;
  END LOOP;
END $$;

-- Wallet auth: server-issued single-use nonces
CREATE TABLE IF NOT EXISTS public.wallet_auth_nonces (
  wallet_address text PRIMARY KEY,
  nonce text NOT NULL,
  message text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_auth_nonces ENABLE ROW LEVEL SECURITY;

-- No client policies: only service role (used by edge functions) can read/write.
