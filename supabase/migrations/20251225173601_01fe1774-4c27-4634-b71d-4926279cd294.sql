-- Table for likes/dislikes on completed tasks
CREATE TABLE public.task_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  like_type TEXT NOT NULL CHECK (like_type IN ('like', 'dislike')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(task_id, user_id)
);

ALTER TABLE public.task_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes" ON public.task_likes
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can like" ON public.task_likes
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own like" ON public.task_likes
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own like" ON public.task_likes
FOR DELETE USING (auth.uid() = user_id);

-- Add columns for like counts on tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS dislikes INTEGER DEFAULT 0;

-- Function to update like counts
CREATE OR REPLACE FUNCTION public.update_task_like_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.like_type = 'like' THEN
      UPDATE public.tasks SET likes = COALESCE(likes, 0) + 1 WHERE id = NEW.task_id;
    ELSE
      UPDATE public.tasks SET dislikes = COALESCE(dislikes, 0) + 1 WHERE id = NEW.task_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.like_type = 'like' THEN
      UPDATE public.tasks SET likes = GREATEST(COALESCE(likes, 0) - 1, 0) WHERE id = OLD.task_id;
    ELSE
      UPDATE public.tasks SET dislikes = GREATEST(COALESCE(dislikes, 0) - 1, 0) WHERE id = OLD.task_id;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Decrement old type
    IF OLD.like_type = 'like' THEN
      UPDATE public.tasks SET likes = GREATEST(COALESCE(likes, 0) - 1, 0) WHERE id = OLD.task_id;
    ELSE
      UPDATE public.tasks SET dislikes = GREATEST(COALESCE(dislikes, 0) - 1, 0) WHERE id = OLD.task_id;
    END IF;
    -- Increment new type
    IF NEW.like_type = 'like' THEN
      UPDATE public.tasks SET likes = COALESCE(likes, 0) + 1 WHERE id = NEW.task_id;
    ELSE
      UPDATE public.tasks SET dislikes = COALESCE(dislikes, 0) + 1 WHERE id = NEW.task_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger for like counts
CREATE TRIGGER update_task_likes_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.task_likes
FOR EACH ROW
EXECUTE FUNCTION public.update_task_like_counts();