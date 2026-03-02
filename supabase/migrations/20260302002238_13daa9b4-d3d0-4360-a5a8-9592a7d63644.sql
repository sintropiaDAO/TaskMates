
-- Add 'physical_resources' to the tag_category enum
ALTER TYPE public.tag_category ADD VALUE IF NOT EXISTS 'physical_resources';
