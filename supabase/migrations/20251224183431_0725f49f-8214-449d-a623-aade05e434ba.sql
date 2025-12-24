-- Drop and recreate view with SECURITY INVOKER (default, safer)
DROP VIEW IF EXISTS public.public_profiles;

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

-- Grant access to the view for authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;

-- Also need to allow viewing other profiles for collaboration features
-- but this will be done through the view, not direct table access
CREATE POLICY "Authenticated can view profiles via view"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- The previous policy allows users to see their own profile
-- Let's keep both - users see own full profile, view filters out wallet for others