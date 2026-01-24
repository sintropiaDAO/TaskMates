-- Add quiz_completed column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS quiz_completed BOOLEAN DEFAULT false;