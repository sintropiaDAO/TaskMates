
DROP POLICY IF EXISTS "Authenticated users can upload task images" ON storage.objects;
CREATE POLICY "Authenticated users can upload task images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'task-images'
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can upload task proofs" ON storage.objects;
CREATE POLICY "Users can upload task proofs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'task-proofs'
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
