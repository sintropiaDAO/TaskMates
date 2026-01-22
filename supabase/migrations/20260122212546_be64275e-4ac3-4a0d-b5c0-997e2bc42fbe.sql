-- Remove the existing unique constraint on (task_id, user_id)
ALTER TABLE public.task_collaborators 
DROP CONSTRAINT IF EXISTS task_collaborators_task_id_user_id_key;

-- Add a new unique constraint on (task_id, user_id, status) to prevent duplicate entries of the same type
ALTER TABLE public.task_collaborators 
ADD CONSTRAINT task_collaborators_task_id_user_id_status_key UNIQUE (task_id, user_id, status);