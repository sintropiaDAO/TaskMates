-- Create storage bucket for task completion proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-proofs', 'task-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own proofs
CREATE POLICY "Users can upload task proofs"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'task-proofs' 
  AND auth.role() = 'authenticated'
);

-- Allow anyone to view proofs (public bucket)
CREATE POLICY "Anyone can view task proofs"
ON storage.objects
FOR SELECT
USING (bucket_id = 'task-proofs');

-- Allow users to delete their own proofs
CREATE POLICY "Users can delete own task proofs"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'task-proofs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);