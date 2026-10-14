ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS task_subtype text NOT NULL DEFAULT 'service',
  ADD COLUMN IF NOT EXISTS meeting_url text,
  ADD COLUMN IF NOT EXISTS meeting_notes text,
  ADD COLUMN IF NOT EXISTS event_is_hybrid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS event_max_attendees integer,
  ADD COLUMN IF NOT EXISTS service_delivery_format text,
  ADD COLUMN IF NOT EXISTS project_deliverables text;

ALTER TABLE public.tasks ADD CONSTRAINT tasks_task_subtype_check CHECK (task_subtype IN ('meeting','event','project','service'));
ALTER TABLE public.tasks ADD CONSTRAINT tasks_service_delivery_format_check CHECK (service_delivery_format IS NULL OR service_delivery_format IN ('remote','in_person','both'));

CREATE INDEX IF NOT EXISTS idx_tasks_portfolio ON public.tasks (created_by, task_subtype, status);

CREATE TABLE public.task_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'interested',
  checked_in_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, user_id),
  CONSTRAINT task_attendees_status_check CHECK (status IN ('interested','checked_in'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_attendees TO authenticated;
GRANT SELECT ON public.task_attendees TO anon;
GRANT ALL ON public.task_attendees TO service_role;
ALTER TABLE public.task_attendees ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_task_attendees_user ON public.task_attendees (user_id, status);

CREATE POLICY "Attendees are viewable by everyone" ON public.task_attendees FOR SELECT USING (true);
CREATE POLICY "Users register own attendance" ON public.task_attendees FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'interested');
CREATE POLICY "Users or organizer update attendance" ON public.task_attendees FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.created_by = auth.uid()));
CREATE POLICY "Users or organizer remove attendance" ON public.task_attendees FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.created_by = auth.uid()));