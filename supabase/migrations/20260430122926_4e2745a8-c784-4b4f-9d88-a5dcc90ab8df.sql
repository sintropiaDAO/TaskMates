
-- Revoke ALL on products from anon/authenticated/PUBLIC, then re-grant safe columns only.
REVOKE ALL ON public.products FROM anon, authenticated, PUBLIC;

-- Re-grant SELECT on safe columns (excluding delivery_code)
GRANT SELECT (
  id, title, product_type, priority, quantity, downvotes, upvotes,
  updated_at, created_at, created_by, collective_use, status,
  reference_url, description, image_url, location
) ON public.products TO anon, authenticated;

-- Authenticated users can write (RLS still enforces ownership). Include delivery_code for INSERT/UPDATE by owners.
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
