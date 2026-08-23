DO $$
DECLARE cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ')
    INTO cols
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='products' AND column_name <> 'delivery_code';

  EXECUTE 'REVOKE SELECT ON public.products FROM anon';
  EXECUTE 'REVOKE SELECT ON public.products FROM authenticated';
  EXECUTE format('GRANT SELECT (%s) ON public.products TO anon', cols);
  EXECUTE format('GRANT SELECT (%s) ON public.products TO authenticated', cols);
END $$;

GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;