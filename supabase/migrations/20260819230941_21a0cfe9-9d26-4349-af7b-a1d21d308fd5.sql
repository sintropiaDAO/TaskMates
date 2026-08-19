ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'en';

CREATE OR REPLACE FUNCTION public.get_user_email_language(_email text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT p.preferred_language
       FROM auth.users u
       JOIN public.profiles p ON p.id = u.id
      WHERE lower(u.email) = lower(_email)
      LIMIT 1),
    (SELECT NULLIF(u.raw_user_meta_data->>'language', '')
       FROM auth.users u
      WHERE lower(u.email) = lower(_email)
      LIMIT 1),
    'en'
  );
$$;

REVOKE ALL ON FUNCTION public.get_user_email_language(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_email_language(text) TO service_role;