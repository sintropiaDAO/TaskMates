
-- Create product_ratings table for mutual rating after delivery
CREATE TABLE public.product_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  rated_user_id uuid NOT NULL,
  rater_user_id uuid NOT NULL,
  rating integer NOT NULL,
  comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(product_id, rated_user_id, rater_user_id)
);

ALTER TABLE public.product_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product ratings" ON public.product_ratings FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create product ratings" ON public.product_ratings FOR INSERT WITH CHECK (auth.uid() = rater_user_id);
CREATE POLICY "Users can update own product ratings" ON public.product_ratings FOR UPDATE USING (auth.uid() = rater_user_id);
