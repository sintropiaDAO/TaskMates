
-- Create user_badges table to store earned badges
CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  category text NOT NULL, -- 'taskmates' | 'habits' | 'communities' | 'leadership' | 'collaboration' | 'positive_impact' | 'sociability' | 'reliability' | 'consistency'
  level integer NOT NULL DEFAULT 1, -- 1-9, then 10=silver, 11=gold, 12=diamond
  entity_id text, -- tag_id for habits/communities/consistency/positive_impact, user_id for taskmates, null for others
  entity_name text, -- cached name for display (tag name or user name)
  metric_value integer NOT NULL DEFAULT 0, -- current metric count
  earned_at timestamp with time zone NOT NULL DEFAULT now(),
  notified boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Anyone can view badges
CREATE POLICY "Anyone can view badges"
ON public.user_badges
FOR SELECT
USING (true);

-- Users can only manage their own badges (we'll use service role for inserts)
CREATE POLICY "Service role can manage badges"
ON public.user_badges
FOR ALL
USING (auth.role() = 'service_role');

-- Allow authenticated users to insert/update their own badges
CREATE POLICY "Users can manage own badges"
ON public.user_badges
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_category ON public.user_badges(category);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_category ON public.user_badges(user_id, category, entity_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_badges_updated_at
BEFORE UPDATE ON public.user_badges
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
