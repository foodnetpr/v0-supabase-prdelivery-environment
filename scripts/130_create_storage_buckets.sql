-- Create storage bucket for images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to images bucket
CREATE POLICY "Public read access for images" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'images');

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload images" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'images');

-- Allow authenticated users to update their uploaded images
CREATE POLICY "Authenticated users can update images" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'images');

-- Allow authenticated users to delete images
CREATE POLICY "Authenticated users can delete images" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'images');
