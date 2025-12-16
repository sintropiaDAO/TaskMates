-- Add blockchain transaction hash column to tasks
ALTER TABLE public.tasks 
ADD COLUMN blockchain_tx_hash text;