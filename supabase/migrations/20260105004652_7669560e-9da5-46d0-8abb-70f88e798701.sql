-- Drop and recreate view without SECURITY DEFINER (using default SECURITY INVOKER)
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles 
WITH (security_invoker = true) AS
SELECT 
  id,
  full_name,
  avatar_url,
  bio,
  location,
  social_links,
  created_at
FROM public.profiles;