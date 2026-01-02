-- Create table for task history
CREATE TABLE public.task_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view task history"
ON public.task_history
FOR SELECT
USING (true);

CREATE POLICY "Service role can insert task history"
ON public.task_history
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can insert task history"
ON public.task_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Enable realtime for task_history
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_history;