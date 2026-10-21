CREATE OR REPLACE FUNCTION public.preserve_community_invite_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (to_jsonb(NEW) - 'status' - 'updated_at') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'updated_at') THEN
    RAISE EXCEPTION 'Community invite identity cannot be changed' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.preserve_community_invite_identity() FROM PUBLIC;
CREATE TRIGGER preserve_community_invite_identity
BEFORE UPDATE ON public.community_invites
FOR EACH ROW EXECUTE FUNCTION public.preserve_community_invite_identity();