-- Create tag_translations table for manual translations
CREATE TABLE public.tag_translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  translated_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tag_id, language)
);

-- Enable RLS
ALTER TABLE public.tag_translations ENABLE ROW LEVEL SECURITY;

-- Anyone can view translations
CREATE POLICY "Anyone can view tag translations"
ON public.tag_translations
FOR SELECT
USING (true);

-- Only admins can manage translations
CREATE POLICY "Admins can insert tag translations"
ON public.tag_translations
FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update tag translations"
ON public.tag_translations
FOR UPDATE
USING (public.is_admin());

CREATE POLICY "Admins can delete tag translations"
ON public.tag_translations
FOR DELETE
USING (public.is_admin());

-- Add trigger for updated_at
CREATE TRIGGER update_tag_translations_updated_at
BEFORE UPDATE ON public.tag_translations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert Flávia Macedo as admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('3bfb3a31-ebd0-4408-842f-0a797ad4cb5d', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;