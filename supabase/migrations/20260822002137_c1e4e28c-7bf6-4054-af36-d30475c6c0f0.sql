DROP POLICY IF EXISTS "DM uploaders can delete own attachments" ON storage.objects;

CREATE POLICY "DM uploaders can delete own attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'dm-attachments'
  AND public.user_is_conversation_participant((NULLIF((storage.foldername(name))[1], ''))::uuid, auth.uid())
  AND (storage.foldername(name))[2] = (auth.uid())::text
);