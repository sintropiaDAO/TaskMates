CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  full_name,
  avatar_url,
  bio,
  location,
  social_links,
  created_at,
  is_verified
FROM public.profiles;