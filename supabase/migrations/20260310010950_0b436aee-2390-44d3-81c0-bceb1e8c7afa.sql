
-- Reports table for flagging users, tasks, products, polls, tags
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL,
  entity_type TEXT NOT NULL, -- 'user', 'task', 'product', 'poll', 'tag'
  entity_id UUID NOT NULL,
  comment TEXT NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Report likes table
CREATE TABLE public.report_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  like_type TEXT NOT NULL, -- 'like' or 'dislike'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(report_id, user_id)
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_likes ENABLE ROW LEVEL SECURITY;

-- RLS for reports
CREATE POLICY "Anyone authenticated can view reports" ON public.reports
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create reports" ON public.reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can delete own reports" ON public.reports
  FOR DELETE TO authenticated USING (auth.uid() = reporter_id);

-- RLS for report_likes
CREATE POLICY "Anyone authenticated can view report likes" ON public.report_likes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can like reports" ON public.report_likes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own report likes" ON public.report_likes
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own report likes" ON public.report_likes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Enable realtime for reports
ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
