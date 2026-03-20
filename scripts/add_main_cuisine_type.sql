-- Add main_cuisine_type column to restaurants table
-- This will be the primary cuisine displayed on restaurant tiles
-- The existing cuisine_types array will be used for filtering purposes

ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS main_cuisine_type text;

-- Set default main_cuisine_type from existing cuisine_type or first item in cuisine_types array
UPDATE restaurants
SET main_cuisine_type = COALESCE(
  cuisine_type,
  cuisine_types[1],
  'Variada'
)
WHERE main_cuisine_type IS NULL;
