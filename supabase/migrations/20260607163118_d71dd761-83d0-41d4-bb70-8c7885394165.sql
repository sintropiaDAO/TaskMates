
CREATE OR REPLACE FUNCTION public.guard_profile_is_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow when value isn't changing
  IF NEW.is_verified IS NOT DISTINCT FROM OLD.is_verified THEN
    RETURN NEW;
  END IF;

  -- Allow service_role (edge functions / admin code) and definer-context callers
  IF auth.role() = 'service_role' OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Allow admins
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Only admins can change is_verified';
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_is_verified ON public.profiles;
CREATE TRIGGER guard_profile_is_verified
  BEFORE UPDATE OF is_verified ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_is_verified();
