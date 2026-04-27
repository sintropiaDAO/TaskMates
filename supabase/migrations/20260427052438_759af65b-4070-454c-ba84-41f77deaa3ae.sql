-- 1) Remove the abuse `reports` table from the realtime publication.
-- Reports contain reporter_id (including non-anonymous reports) and should not
-- be broadcast to all subscribers via postgres_changes.
ALTER PUBLICATION supabase_realtime DROP TABLE public.reports;

-- 2) Lock down realtime.messages (used by Broadcast/Presence channel
-- authorization). The application only relies on postgres_changes streams,
-- which are governed by table-level RLS, so we deny all Broadcast/Presence
-- access by default. If a future feature needs Broadcast or Presence, an
-- explicit allow policy can be added per topic pattern.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny all broadcast and presence by default" ON realtime.messages;

CREATE POLICY "Deny all broadcast and presence by default"
ON realtime.messages
FOR SELECT
TO authenticated, anon
USING (false);

DROP POLICY IF EXISTS "Deny all broadcast and presence writes by default" ON realtime.messages;

CREATE POLICY "Deny all broadcast and presence writes by default"
ON realtime.messages
FOR INSERT
TO authenticated, anon
WITH CHECK (false);