-- Drop the current permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Create a more restrictive policy: users can only view their own full profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Create a view for public profile data (excluding sensitive wallet_address)
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  full_name,
  avatar_url,
  bio,
  location,
  created_at
FROM public.profiles;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;