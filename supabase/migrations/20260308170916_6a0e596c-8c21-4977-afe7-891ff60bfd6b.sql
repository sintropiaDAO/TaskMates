
-- Add is_verified column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

-- Create user_vouches table
CREATE TABLE public.user_vouches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id uuid NOT NULL,
  vouched_user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(voucher_id, vouched_user_id)
);

-- Enable RLS
ALTER TABLE public.user_vouches ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_vouches
CREATE POLICY "Anyone can view vouches" ON public.user_vouches
  FOR SELECT USING (true);

CREATE POLICY "Verified users can vouch" ON public.user_vouches
  FOR INSERT WITH CHECK (
    auth.uid() = voucher_id
    AND voucher_id != vouched_user_id
    AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_verified = true
    )
  );

CREATE POLICY "Users can remove own vouches" ON public.user_vouches
  FOR DELETE USING (auth.uid() = voucher_id);

-- Function to auto-verify user when they reach 3 vouches
CREATE OR REPLACE FUNCTION public.check_vouch_threshold()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  vouch_count integer;
BEGIN
  SELECT COUNT(*) INTO vouch_count
  FROM public.user_vouches
  WHERE vouched_user_id = NEW.vouched_user_id;

  IF vouch_count >= 3 THEN
    UPDATE public.profiles
    SET is_verified = true
    WHERE id = NEW.vouched_user_id AND is_verified = false;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to check vouch threshold after insert
CREATE TRIGGER on_vouch_inserted
  AFTER INSERT ON public.user_vouches
  FOR EACH ROW
  EXECUTE FUNCTION public.check_vouch_threshold();
