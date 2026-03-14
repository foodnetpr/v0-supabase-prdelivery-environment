-- Add marketplace_image_url column to restaurants table
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS marketplace_image_url TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.restaurants.marketplace_image_url IS 'Image displayed on marketplace tile (different from logo)';
