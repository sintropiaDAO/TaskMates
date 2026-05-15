
-- 1) coin_ledger: restrict SELECT to the subject user
DROP POLICY IF EXISTS "Authenticated users can view coin_ledger" ON public.coin_ledger;
CREATE POLICY "Users can view own coin_ledger"
ON public.coin_ledger
FOR SELECT
TO authenticated
USING (subject_user_id = auth.uid());

-- 2) reports: restrict SELECT to admins or the reporter; add helper to fetch sanitized reports
DROP POLICY IF EXISTS "Anyone authenticated can view reports" ON public.reports;
CREATE POLICY "Admins or reporter can view reports"
ON public.reports
FOR SELECT
TO authenticated
USING (is_admin() OR reporter_id = auth.uid());

CREATE OR REPLACE FUNCTION public.get_reports_for_entity(_entity_type text, _entity_id uuid)
RETURNS TABLE (
  id uuid,
  entity_type text,
  entity_id uuid,
  comment text,
  is_anonymous boolean,
  created_at timestamptz,
  reporter_id uuid
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.entity_type, r.entity_id, r.comment, r.is_anonymous, r.created_at,
         CASE
           WHEN r.is_anonymous AND NOT (public.is_admin() OR r.reporter_id = auth.uid())
             THEN NULL
           ELSE r.reporter_id
         END AS reporter_id
  FROM public.reports r
  WHERE r.entity_type = _entity_type
    AND r.entity_id = _entity_id
    AND auth.uid() IS NOT NULL
  ORDER BY r.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_reports_for_entity(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_reports_for_entity(text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.count_reports_for_entity(_entity_type text, _entity_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint FROM public.reports
   WHERE entity_type = _entity_type AND entity_id = _entity_id;
$$;

REVOKE ALL ON FUNCTION public.count_reports_for_entity(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.count_reports_for_entity(text, uuid) TO authenticated, anon;

-- 3) task_products: drop overly broad policies, keep owner-scoped only
DROP POLICY IF EXISTS "Authenticated users can link products" ON public.task_products;
DROP POLICY IF EXISTS "Users can remove linked products" ON public.task_products;

-- Ensure owner-scoped policies exist (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='task_products'
      AND policyname='Task or product owner can link'
  ) THEN
    CREATE POLICY "Task or product owner can link"
    ON public.task_products
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_products.task_id AND t.created_by = auth.uid())
      OR EXISTS (SELECT 1 FROM public.products p WHERE p.id = task_products.product_id AND p.created_by = auth.uid())
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='task_products'
      AND policyname='Task or product owner can unlink'
  ) THEN
    CREATE POLICY "Task or product owner can unlink"
    ON public.task_products
    FOR DELETE
    TO authenticated
    USING (
      EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_products.task_id AND t.created_by = auth.uid())
      OR EXISTS (SELECT 1 FROM public.products p WHERE p.id = task_products.product_id AND p.created_by = auth.uid())
    );
  END IF;
END $$;

-- 4) conversation_participants: restrict INSERT to self or existing participants
DROP POLICY IF EXISTS "Authenticated users can add participants" ON public.conversation_participants;
CREATE POLICY "Users can add self or others to own conversations"
ON public.conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR public.user_is_conversation_participant(conversation_id, auth.uid())
);
