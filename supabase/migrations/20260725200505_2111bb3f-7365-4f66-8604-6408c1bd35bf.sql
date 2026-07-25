DROP POLICY IF EXISTS "Allow public read on email-assets" ON storage.objects;

CREATE POLICY "Service role can read email-assets"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'email-assets');