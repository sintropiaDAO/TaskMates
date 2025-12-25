-- Table for star ratings on task collaborators (5-star rating system)
CREATE TABLE public.task_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  rated_user_id UUID NOT NULL, -- the user being rated (collaborator)
  rater_user_id UUID NOT NULL, -- the user giving the rating (requester)
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(task_id, rated_user_id, rater_user_id)
);

ALTER TABLE public.task_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ratings" ON public.task_ratings
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create ratings" ON public.task_ratings
FOR INSERT WITH CHECK (auth.uid() = rater_user_id);

CREATE POLICY "Users can update own ratings" ON public.task_ratings
FOR UPDATE USING (auth.uid() = rater_user_id);

-- Table for testimonials on user profiles
CREATE TABLE public.testimonials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_user_id UUID NOT NULL, -- the user whose profile receives the testimonial
  author_user_id UUID NOT NULL, -- the user writing the testimonial
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view testimonials" ON public.testimonials
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create testimonials" ON public.testimonials
FOR INSERT WITH CHECK (auth.uid() = author_user_id);

CREATE POLICY "Users can update own testimonials" ON public.testimonials
FOR UPDATE USING (auth.uid() = author_user_id);

CREATE POLICY "Users can delete own testimonials" ON public.testimonials
FOR DELETE USING (auth.uid() = author_user_id);

-- Table for tags on testimonials
CREATE TABLE public.testimonial_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  testimonial_id UUID NOT NULL REFERENCES public.testimonials(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(testimonial_id, tag_id)
);

ALTER TABLE public.testimonial_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view testimonial_tags" ON public.testimonial_tags
FOR SELECT USING (true);

CREATE POLICY "Testimonial authors can manage tags" ON public.testimonial_tags
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.testimonials 
    WHERE id = testimonial_id AND author_user_id = auth.uid()
  )
);

CREATE POLICY "Testimonial authors can delete tags" ON public.testimonial_tags
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.testimonials 
    WHERE id = testimonial_id AND author_user_id = auth.uid()
  )
);

-- Trigger for updated_at on testimonials
CREATE TRIGGER update_testimonials_updated_at
BEFORE UPDATE ON public.testimonials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();