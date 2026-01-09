-- Create bucket for task images
INSERT INTO storage.buckets (id, name, public) VALUES ('task-images', 'task-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for task-images bucket
CREATE POLICY "Anyone can view task images"
ON storage.objects FOR SELECT
USING (bucket_id = 'task-images');

CREATE POLICY "Authenticated users can upload task images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'task-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own task images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'task-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own task images"
ON storage.objects FOR DELETE
USING (bucket_id = 'task-images' AND auth.uid()::text = (storage.foldername(name))[1]);