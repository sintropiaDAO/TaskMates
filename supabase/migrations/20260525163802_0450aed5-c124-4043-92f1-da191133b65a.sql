
-- 1. Restrict delivery_code column to owner-only access via RPC
REVOKE SELECT (delivery_code) ON public.products FROM anon, authenticated;

-- 2. Create private bucket for DM attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('dm-attachments', 'dm-attachments', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "DM participants can view attachments" ON storage.objects;
DROP POLICY IF EXISTS "DM participants can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "DM uploaders can delete own attachments" ON storage.objects;

CREATE POLICY "DM participants can view attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'dm-attachments'
  AND public.user_is_conversation_participant(
    NULLIF((storage.foldername(name))[1], '')::uuid,
    auth.uid()
  )
);

CREATE POLICY "DM participants can upload attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'dm-attachments'
  AND public.user_is_conversation_participant(
    NULLIF((storage.foldername(name))[1], '')::uuid,
    auth.uid()
  )
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "DM uploaders can delete own attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'dm-attachments'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
