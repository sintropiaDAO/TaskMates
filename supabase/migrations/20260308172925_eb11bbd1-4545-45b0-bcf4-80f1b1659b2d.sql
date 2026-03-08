-- Allow admins to update any profile (for verification toggle)
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());