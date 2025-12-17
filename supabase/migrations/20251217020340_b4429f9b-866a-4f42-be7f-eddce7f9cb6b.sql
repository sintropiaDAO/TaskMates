-- Create function to update task vote counts
CREATE OR REPLACE FUNCTION public.update_task_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 'up' THEN
      UPDATE public.tasks SET upvotes = COALESCE(upvotes, 0) + 1 WHERE id = NEW.task_id;
    ELSE
      UPDATE public.tasks SET downvotes = COALESCE(downvotes, 0) + 1 WHERE id = NEW.task_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 'up' THEN
      UPDATE public.tasks SET upvotes = GREATEST(COALESCE(upvotes, 0) - 1, 0) WHERE id = OLD.task_id;
    ELSE
      UPDATE public.tasks SET downvotes = GREATEST(COALESCE(downvotes, 0) - 1, 0) WHERE id = OLD.task_id;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Decrement old vote type
    IF OLD.vote_type = 'up' THEN
      UPDATE public.tasks SET upvotes = GREATEST(COALESCE(upvotes, 0) - 1, 0) WHERE id = OLD.task_id;
    ELSE
      UPDATE public.tasks SET downvotes = GREATEST(COALESCE(downvotes, 0) - 1, 0) WHERE id = OLD.task_id;
    END IF;
    -- Increment new vote type
    IF NEW.vote_type = 'up' THEN
      UPDATE public.tasks SET upvotes = COALESCE(upvotes, 0) + 1 WHERE id = NEW.task_id;
    ELSE
      UPDATE public.tasks SET downvotes = COALESCE(downvotes, 0) + 1 WHERE id = NEW.task_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on task_votes
DROP TRIGGER IF EXISTS update_vote_counts_trigger ON public.task_votes;
CREATE TRIGGER update_vote_counts_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.task_votes
FOR EACH ROW
EXECUTE FUNCTION public.update_task_vote_counts();