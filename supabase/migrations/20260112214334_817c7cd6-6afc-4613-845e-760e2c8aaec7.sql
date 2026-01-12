-- Add columns to store collaborator completion proof
ALTER TABLE public.task_collaborators 
ADD COLUMN IF NOT EXISTS completion_proof_url TEXT,
ADD COLUMN IF NOT EXISTS completion_proof_type TEXT,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;