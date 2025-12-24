-- Remove the permissive policy that exposes wallet_address
DROP POLICY IF EXISTS "Authenticated can view profiles via view" ON public.profiles;

-- Keep only the restrictive policy for own profile
-- Users can view their own full profile (with wallet_address)
-- For other users' data, the application should use the public_profiles view