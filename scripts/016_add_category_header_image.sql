-- Add header image URL field to categories for promotional banners
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS header_image_url TEXT;

COMMENT ON COLUMN categories.header_image_url IS 'URL for full-width promotional banner image displayed above category section';
