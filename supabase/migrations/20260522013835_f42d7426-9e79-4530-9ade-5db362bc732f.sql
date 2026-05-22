
CREATE TABLE public.capy_vera_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  category text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.capy_vera_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active capy vera questions"
ON public.capy_vera_questions FOR SELECT
USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert capy vera questions"
ON public.capy_vera_questions FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update capy vera questions"
ON public.capy_vera_questions FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete capy vera questions"
ON public.capy_vera_questions FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER capy_vera_questions_set_updated_at
BEFORE UPDATE ON public.capy_vera_questions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.capy_vera_questions (question, category) VALUES
('What are you good at?', 'skills'),
('What gifts would you like to share?', 'skills'),
('What skills have you proudly developed?', 'skills'),
('What are the things you love doing?', 'skills'),
('What skills are you recognized for?', 'skills'),
('What habits would you happily help others build?', 'skills'),
('What activities spark your interest and get you in the flow state?', 'passions'),
('What would you work with if money was not a goal or a problem?', 'passions'),
('What skills would you like to develop?', 'passions'),
('What activities make you feel productive?', 'passions'),
('How do you like to spend your free time?', 'passions'),
('What causes are you passionate about and inspire you to take action?', 'passions'),
('What subjects do you love to read about, study, or stay informed on?', 'knowledge'),
('What subjects could you give lectures on?', 'knowledge'),
('What topics do you like to discuss and share your ideas?', 'knowledge'),
('What type of content would you spend hours talking about?', 'knowledge'),
('What topics spark your creativity and imagination?', 'knowledge'),
('What improvements would you like to see in your life or community?', 'needs'),
('What tasks do you need help with?', 'needs'),
('What issues do you need help solving?', 'needs'),
('What are your goals for the future?', 'needs'),
('What dreams did you give up on due to lack of support?', 'needs'),
('Do you have any bad habits you need help to overcome?', 'needs'),
('What tasks do you consider crucial for your happiness and leisure?', 'needs');
