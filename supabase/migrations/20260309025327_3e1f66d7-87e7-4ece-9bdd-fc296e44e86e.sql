
-- Add upvotes/downvotes columns to products and polls
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS upvotes integer DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS downvotes integer DEFAULT 0;
ALTER TABLE public.polls ADD COLUMN IF NOT EXISTS upvotes integer DEFAULT 0;
ALTER TABLE public.polls ADD COLUMN IF NOT EXISTS downvotes integer DEFAULT 0;

-- Create product_likes table
CREATE TABLE public.product_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  like_type text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(product_id, user_id)
);

ALTER TABLE public.product_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product likes" ON public.product_likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can like products" ON public.product_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own product likes" ON public.product_likes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own product likes" ON public.product_likes FOR DELETE USING (auth.uid() = user_id);

-- Create poll_likes table
CREATE TABLE public.poll_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  like_type text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

ALTER TABLE public.poll_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view poll likes" ON public.poll_likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can like polls" ON public.poll_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own poll likes" ON public.poll_likes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own poll likes" ON public.poll_likes FOR DELETE USING (auth.uid() = user_id);

-- Trigger function for product likes
CREATE OR REPLACE FUNCTION public.update_product_like_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.like_type = 'up' THEN
      UPDATE public.products SET upvotes = COALESCE(upvotes, 0) + 1 WHERE id = NEW.product_id;
    ELSE
      UPDATE public.products SET downvotes = COALESCE(downvotes, 0) + 1 WHERE id = NEW.product_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.like_type = 'up' THEN
      UPDATE public.products SET upvotes = GREATEST(COALESCE(upvotes, 0) - 1, 0) WHERE id = OLD.product_id;
    ELSE
      UPDATE public.products SET downvotes = GREATEST(COALESCE(downvotes, 0) - 1, 0) WHERE id = OLD.product_id;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.like_type = 'up' THEN
      UPDATE public.products SET upvotes = GREATEST(COALESCE(upvotes, 0) - 1, 0) WHERE id = OLD.product_id;
    ELSE
      UPDATE public.products SET downvotes = GREATEST(COALESCE(downvotes, 0) - 1, 0) WHERE id = OLD.product_id;
    END IF;
    IF NEW.like_type = 'up' THEN
      UPDATE public.products SET upvotes = COALESCE(upvotes, 0) + 1 WHERE id = NEW.product_id;
    ELSE
      UPDATE public.products SET downvotes = COALESCE(downvotes, 0) + 1 WHERE id = NEW.product_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER update_product_like_counts_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.product_likes
FOR EACH ROW EXECUTE FUNCTION public.update_product_like_counts();

-- Trigger function for poll likes
CREATE OR REPLACE FUNCTION public.update_poll_like_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.like_type = 'up' THEN
      UPDATE public.polls SET upvotes = COALESCE(upvotes, 0) + 1 WHERE id = NEW.poll_id;
    ELSE
      UPDATE public.polls SET downvotes = COALESCE(downvotes, 0) + 1 WHERE id = NEW.poll_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.like_type = 'up' THEN
      UPDATE public.polls SET upvotes = GREATEST(COALESCE(upvotes, 0) - 1, 0) WHERE id = OLD.poll_id;
    ELSE
      UPDATE public.polls SET downvotes = GREATEST(COALESCE(downvotes, 0) - 1, 0) WHERE id = OLD.poll_id;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.like_type = 'up' THEN
      UPDATE public.polls SET upvotes = GREATEST(COALESCE(upvotes, 0) - 1, 0) WHERE id = OLD.poll_id;
    ELSE
      UPDATE public.polls SET downvotes = GREATEST(COALESCE(downvotes, 0) - 1, 0) WHERE id = OLD.poll_id;
    END IF;
    IF NEW.like_type = 'up' THEN
      UPDATE public.polls SET upvotes = COALESCE(upvotes, 0) + 1 WHERE id = NEW.poll_id;
    ELSE
      UPDATE public.polls SET downvotes = COALESCE(downvotes, 0) + 1 WHERE id = NEW.poll_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER update_poll_like_counts_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.poll_likes
FOR EACH ROW EXECUTE FUNCTION public.update_poll_like_counts();
