CREATE TABLE public.portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  owner_id uuid NOT NULL,
  title text NOT NULL,
  summary text,
  period_start date,
  period_end date,
  tag_id uuid REFERENCES public.tags(id) ON DELETE SET NULL,
  scope text NOT NULL DEFAULT 'mine',
  include_tasks boolean NOT NULL DEFAULT true,
  include_products boolean NOT NULL DEFAULT true,
  include_polls boolean NOT NULL DEFAULT true,
  task_subtypes text[] NOT NULL DEFAULT '{}',
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT portfolios_scope_chk CHECK (scope IN ('mine','tag'))
);
GRANT SELECT ON public.portfolios TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolios TO authenticated;
GRANT ALL ON public.portfolios TO service_role;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Portfolios are public" ON public.portfolios FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owners insert portfolios" ON public.portfolios FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners update portfolios" ON public.portfolios FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners delete portfolios" ON public.portfolios FOR DELETE TO authenticated USING (owner_id = auth.uid());
CREATE INDEX portfolios_owner_idx ON public.portfolios(owner_id);
CREATE TRIGGER portfolios_updated_at BEFORE UPDATE ON public.portfolios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();