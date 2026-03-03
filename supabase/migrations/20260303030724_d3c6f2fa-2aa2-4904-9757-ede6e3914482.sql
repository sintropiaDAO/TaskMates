
-- Add username column to profiles
ALTER TABLE public.profiles ADD COLUMN username text UNIQUE;

-- Create index for fast lookups
CREATE INDEX idx_profiles_username ON public.profiles (username);

-- Function to generate random username
CREATE OR REPLACE FUNCTION public.generate_random_username()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  new_username text;
  username_exists boolean;
BEGIN
  LOOP
    new_username := 'user_' || substr(md5(random()::text), 1, 8);
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE username = new_username) INTO username_exists;
    EXIT WHEN NOT username_exists;
  END LOOP;
  RETURN new_username;
END;
$$;

-- Backfill existing users with random usernames
UPDATE public.profiles SET username = 'user_' || substr(md5(id::text || random()::text), 1, 8) WHERE username IS NULL;

-- Make column NOT NULL after backfill
ALTER TABLE public.profiles ALTER COLUMN username SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN username SET DEFAULT public.generate_random_username();
