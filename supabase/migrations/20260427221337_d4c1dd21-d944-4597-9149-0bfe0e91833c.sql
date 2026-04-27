-- Restrict user_badges access:
-- 1) Drop public SELECT and self-management policies
-- 2) Allow only authenticated users to view badges
-- 3) Writes are restricted to service role (handled by existing policy)

DROP POLICY IF EXISTS "Anyone can view badges" ON public.user_badges;
DROP POLICY IF EXISTS "Users can manage own badges" ON public.user_badges;

CREATE POLICY "Authenticated users can view badges"
ON public.user_badges
FOR SELECT
TO authenticated
USING (true);
