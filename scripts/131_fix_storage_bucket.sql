-- First, check if the bucket exists and create it if not
-- Using a DO block for conditional logic
DO $$
BEGIN
  -- Create the bucket if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'images') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'images',
      'images', 
      true,
      5242880, -- 5MB limit
      ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    );
    RAISE NOTICE 'Created images bucket';
  ELSE
    -- Update existing bucket to ensure it's public
    UPDATE storage.buckets 
    SET public = true,
        file_size_limit = 5242880,
        allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    WHERE id = 'images';
    RAISE NOTICE 'Updated images bucket';
  END IF;
END $$;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Public read access for images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads to images bucket" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload to images" ON storage.objects;

-- Create policies with more permissive rules for the app
-- Allow public read access
CREATE POLICY "Public read access for images" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'images');

-- Allow anyone to upload (since the app uses service role for some operations)
CREATE POLICY "Anyone can upload to images" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'images');

-- Allow anyone to update images in this bucket
CREATE POLICY "Anyone can update images" ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'images');

-- Allow anyone to delete images in this bucket  
CREATE POLICY "Anyone can delete images" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'images');
