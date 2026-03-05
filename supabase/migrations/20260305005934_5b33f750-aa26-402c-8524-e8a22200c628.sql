
-- Products table
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  image_url text,
  location text,
  priority text,
  quantity integer NOT NULL DEFAULT 1,
  product_type text NOT NULL CHECK (product_type IN ('offer', 'request')),
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'unavailable', 'delivered')),
  collective_use boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  delivery_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Product tags
CREATE TABLE public.product_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Product participants
CREATE TABLE public.product_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('supplier', 'requester')),
  quantity integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed')),
  delivery_confirmed boolean NOT NULL DEFAULT false,
  delivery_proof_url text,
  delivery_proof_type text,
  delivery_code_input text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Polls table
CREATE TABLE public.polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  deadline timestamptz,
  allow_new_options boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Poll options
CREATE TABLE public.poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  label text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Poll votes
CREATE TABLE public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (poll_id, user_id)
);

-- Poll tags
CREATE TABLE public.poll_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Product-task relation
CREATE TABLE public.task_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, product_id)
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_products ENABLE ROW LEVEL SECURITY;

-- Products RLS
CREATE POLICY "Anyone can view products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create products" ON public.products FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own products" ON public.products FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete own products" ON public.products FOR DELETE USING (auth.uid() = created_by);

-- Product tags RLS
CREATE POLICY "Anyone can view product_tags" ON public.product_tags FOR SELECT USING (true);
CREATE POLICY "Product owners can manage tags" ON public.product_tags FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.products WHERE id = product_tags.product_id AND created_by = auth.uid()));
CREATE POLICY "Product owners can delete tags" ON public.product_tags FOR DELETE USING (EXISTS (SELECT 1 FROM public.products WHERE id = product_tags.product_id AND created_by = auth.uid()));

-- Product participants RLS
CREATE POLICY "Anyone can view product_participants" ON public.product_participants FOR SELECT USING (true);
CREATE POLICY "Authenticated users can participate" ON public.product_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own participation" ON public.product_participants FOR UPDATE USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.products WHERE id = product_participants.product_id AND created_by = auth.uid()));
CREATE POLICY "Product owners can delete participants" ON public.product_participants FOR DELETE USING (EXISTS (SELECT 1 FROM public.products WHERE id = product_participants.product_id AND created_by = auth.uid()));

-- Polls RLS
CREATE POLICY "Anyone can view polls" ON public.polls FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create polls" ON public.polls FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own polls" ON public.polls FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete own polls" ON public.polls FOR DELETE USING (auth.uid() = created_by);

-- Poll options RLS
CREATE POLICY "Anyone can view poll_options" ON public.poll_options FOR SELECT USING (true);
CREATE POLICY "Authenticated users can add options" ON public.poll_options FOR INSERT WITH CHECK (auth.uid() = created_by AND (EXISTS (SELECT 1 FROM public.polls WHERE id = poll_options.poll_id AND (created_by = auth.uid() OR allow_new_options = true))));
CREATE POLICY "Option creators can delete" ON public.poll_options FOR DELETE USING (auth.uid() = created_by);

-- Poll votes RLS
CREATE POLICY "Anyone can view poll_votes" ON public.poll_votes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can vote" ON public.poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can change vote" ON public.poll_votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can remove vote" ON public.poll_votes FOR DELETE USING (auth.uid() = user_id);

-- Poll tags RLS
CREATE POLICY "Anyone can view poll_tags" ON public.poll_tags FOR SELECT USING (true);
CREATE POLICY "Poll owners can manage tags" ON public.poll_tags FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.polls WHERE id = poll_tags.poll_id AND created_by = auth.uid()));
CREATE POLICY "Poll owners can delete tags" ON public.poll_tags FOR DELETE USING (EXISTS (SELECT 1 FROM public.polls WHERE id = poll_tags.poll_id AND created_by = auth.uid()));

-- Task products RLS
CREATE POLICY "Anyone can view task_products" ON public.task_products FOR SELECT USING (true);
CREATE POLICY "Authenticated users can link products" ON public.task_products FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can remove linked products" ON public.task_products FOR DELETE USING (auth.uid() IS NOT NULL);

-- Enable realtime for products and polls
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;
