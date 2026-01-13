-- Add comment column to task_ratings table
ALTER TABLE public.task_ratings 
ADD COLUMN comment text DEFAULT NULL;

-- Add unique constraint if not exists (for upsert)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'task_ratings_unique_rating'
  ) THEN
    ALTER TABLE public.task_ratings 
    ADD CONSTRAINT task_ratings_unique_rating 
    UNIQUE (task_id, rated_user_id, rater_user_id);
  END IF;
END $$;