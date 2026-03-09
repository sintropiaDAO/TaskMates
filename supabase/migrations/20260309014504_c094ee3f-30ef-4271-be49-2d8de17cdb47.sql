-- Create poll_comments table
CREATE TABLE public.poll_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  attachment_url TEXT,
  attachment_type TEXT,
  attachment_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.poll_comments ENABLE ROW LEVEL SECURITY;

-- Policies for poll_comments
CREATE POLICY "Anyone can view poll comments" ON public.poll_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create poll comments" ON public.poll_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own poll comments" ON public.poll_comments FOR DELETE USING (auth.uid() = user_id);

-- Create poll_comment_likes table
CREATE TABLE public.poll_comment_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.poll_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  like_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS
ALTER TABLE public.poll_comment_likes ENABLE ROW LEVEL SECURITY;

-- Policies for poll_comment_likes
CREATE POLICY "Anyone can view poll comment likes" ON public.poll_comment_likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can like poll comments" ON public.poll_comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own poll comment likes" ON public.poll_comment_likes FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can update own poll comment likes" ON public.poll_comment_likes FOR UPDATE USING (auth.uid() = user_id);

-- Create product_comments table
CREATE TABLE public.product_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  attachment_url TEXT,
  attachment_type TEXT,
  attachment_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_comments ENABLE ROW LEVEL SECURITY;

-- Policies for product_comments
CREATE POLICY "Anyone can view product comments" ON public.product_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create product comments" ON public.product_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own product comments" ON public.product_comments FOR DELETE USING (auth.uid() = user_id);

-- Create product_comment_likes table
CREATE TABLE public.product_comment_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.product_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  like_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS
ALTER TABLE public.product_comment_likes ENABLE ROW LEVEL SECURITY;

-- Policies for product_comment_likes
CREATE POLICY "Anyone can view product comment likes" ON public.product_comment_likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can like product comments" ON public.product_comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own product comment likes" ON public.product_comment_likes FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can update own product comment likes" ON public.product_comment_likes FOR UPDATE USING (auth.uid() = user_id);