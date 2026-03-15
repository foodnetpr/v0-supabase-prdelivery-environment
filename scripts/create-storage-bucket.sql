-- Create a public bucket for assets like cuisine icons
INSERT INTO storage.buckets (id, name, public)
VALUES ('public-assets', 'public-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to the bucket
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'public-assets');

-- Allow authenticated users to upload
CREATE POLICY "Allow uploads" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'public-assets');

-- Allow updates
CREATE POLICY "Allow updates" ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'public-assets');
