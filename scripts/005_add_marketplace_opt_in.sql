-- Add show_in_marketplace column to restaurants table
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS show_in_marketplace BOOLEAN DEFAULT false;

-- Update existing restaurants to not show in marketplace by default
UPDATE public.restaurants 
SET show_in_marketplace = false 
WHERE show_in_marketplace IS NULL;

-- Create index for faster marketplace queries
CREATE INDEX IF NOT EXISTS idx_restaurants_marketplace 
ON public.restaurants(show_in_marketplace, is_active);
