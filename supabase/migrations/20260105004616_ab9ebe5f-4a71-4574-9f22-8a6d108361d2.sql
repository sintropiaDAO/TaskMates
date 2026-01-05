-- Add social links to profiles table
ALTER TABLE public.profiles 
ADD COLUMN social_links jsonb DEFAULT '{}';

-- Update the public_profiles view to include social_links
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles AS
SELECT 
  id,
  full_name,
  avatar_url,
  bio,
  location,
  social_links,
  created_at
FROM public.profiles;