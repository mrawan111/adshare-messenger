-- Create storage bucket for post images
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true);

-- Allow public read access to post images
CREATE POLICY "Post images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'post-images');

-- Allow anyone to upload post images
CREATE POLICY "Anyone can upload post images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'post-images');

-- Allow anyone to delete post images
CREATE POLICY "Anyone can delete post images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'post-images');