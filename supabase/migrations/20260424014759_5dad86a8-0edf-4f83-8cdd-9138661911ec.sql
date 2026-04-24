ALTER TABLE public.profile_section_visibility
ADD COLUMN IF NOT EXISTS show_my_highlights boolean NOT NULL DEFAULT false;