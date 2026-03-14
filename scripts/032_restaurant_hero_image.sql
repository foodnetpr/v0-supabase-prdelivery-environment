-- Add hero_image_url to restaurants for branch selector background
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS hero_image_url TEXT;
