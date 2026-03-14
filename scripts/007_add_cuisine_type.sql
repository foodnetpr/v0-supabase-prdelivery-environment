-- Add cuisine_type column to restaurants table for filtering
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS cuisine_type TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.restaurants.cuisine_type IS 'Type of cuisine (e.g., Mexican, Italian, Asian, American)';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_restaurants_cuisine_type 
ON public.restaurants(cuisine_type);
