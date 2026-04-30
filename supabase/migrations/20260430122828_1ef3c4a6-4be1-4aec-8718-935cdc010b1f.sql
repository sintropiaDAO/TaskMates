
-- Re-apply column-level revokes on products.delivery_code for anon and authenticated.
-- Previous migration's revokes were apparently overridden by subsequent regrants.

REVOKE SELECT (delivery_code) ON public.products FROM anon, authenticated, PUBLIC;

-- Re-grant SELECT on all OTHER columns explicitly so PostgREST continues to work.
GRANT SELECT (
  id, title, product_type, priority, quantity, downvotes, upvotes,
  updated_at, created_at, created_by, collective_use, status,
  reference_url, description, image_url, location
) ON public.products TO anon, authenticated;

-- Ensure INSERT/UPDATE/DELETE still work for authenticated owners (RLS enforces)
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
