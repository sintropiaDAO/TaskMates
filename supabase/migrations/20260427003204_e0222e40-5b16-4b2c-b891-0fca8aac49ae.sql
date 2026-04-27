-- 1) Restrict access to products.delivery_code at the column level.
-- The public/authenticated roles can still read every other column (existing
-- "Anyone can view products" SELECT policy continues to apply), but the
-- delivery_code column is only retrievable through the SECURITY DEFINER
-- function get_product_delivery_code(), which already enforces owner-only access.
REVOKE SELECT (delivery_code) ON public.products FROM anon, authenticated, public;

-- 2) Tighten task_products INSERT/DELETE policies so only the task owner or
-- product owner can link/unlink. SELECT remains public.
DROP POLICY IF EXISTS "Authenticated users can link products to tasks" ON public.task_products;
DROP POLICY IF EXISTS "Authenticated users can unlink products from tasks" ON public.task_products;
DROP POLICY IF EXISTS "Authenticated users can insert task_products" ON public.task_products;
DROP POLICY IF EXISTS "Authenticated users can delete task_products" ON public.task_products;
DROP POLICY IF EXISTS "Task or product owner can link" ON public.task_products;
DROP POLICY IF EXISTS "Task or product owner can unlink" ON public.task_products;

CREATE POLICY "Task or product owner can link"
ON public.task_products
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_products.task_id AND t.created_by = auth.uid())
  OR EXISTS (SELECT 1 FROM public.products p WHERE p.id = task_products.product_id AND p.created_by = auth.uid())
);

CREATE POLICY "Task or product owner can unlink"
ON public.task_products
FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_products.task_id AND t.created_by = auth.uid())
  OR EXISTS (SELECT 1 FROM public.products p WHERE p.id = task_products.product_id AND p.created_by = auth.uid())
);