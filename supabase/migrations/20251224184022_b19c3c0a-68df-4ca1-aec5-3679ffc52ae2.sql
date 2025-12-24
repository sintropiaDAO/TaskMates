-- Drop the existing view
DROP VIEW IF EXISTS public.public_profiles;

-- Recreate view with SECURITY INVOKER
CREATE VIEW public.public_profiles 
WITH (security_invoker = true)
AS
SELECT 
  id,
  full_name,
  avatar_url,
  bio,
  location,
  created_at
FROM public.profiles;

-- Grant SELECT to authenticated and anon users
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;

-- Update the profiles RLS policy to allow authenticated users to view all profiles
-- This is needed because the view uses SECURITY INVOKER
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Allow users to view all profiles (the view filters out sensitive fields)
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);