
-- 1) Recreate public_profiles view with security_invoker
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_invoker = true)
AS
SELECT id, full_name, avatar_url, bio, location, social_links, created_at, is_verified
FROM public.profiles;

-- 2) Tighten storage policies: drop broad public SELECT policies.
-- Public bucket files remain accessible via the public URL (CDN), but the LIST endpoint
-- will no longer return all objects to anonymous clients.
DROP POLICY IF EXISTS "Anyone can view task images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view task proofs" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can view chat attachments" ON storage.objects;

-- Allow authenticated users to list/select only their own files in these buckets
CREATE POLICY "Users can list own task-images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'task-images' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can list own task-proofs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'task-proofs' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can list own avatars"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Participants can list chat-attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-attachments' AND (auth.uid())::text = (storage.foldername(name))[1]);
