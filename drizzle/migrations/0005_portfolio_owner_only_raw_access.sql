ALTER POLICY "Portfolios are public" ON public.portfolios TO authenticated USING (owner_id = auth.uid());
REVOKE SELECT ON public.portfolios FROM anon;
COMMENT ON POLICY "Portfolios are public" ON public.portfolios IS 'Raw portfolio configuration is owner-only; public sharing is resolved by slug through the server-side public-safe portfolio builder.';