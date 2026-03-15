-- Add latitude and longitude columns to restaurants table for distance-based filtering
-- These coordinates are used to calculate distance from customer addresses

-- Add latitude column
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);

-- Add longitude column  
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Add index for faster geo queries
CREATE INDEX IF NOT EXISTS idx_restaurants_coordinates 
ON restaurants (latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add delivery_radius_miles if it doesn't exist (default 10 miles)
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS delivery_radius_miles DECIMAL(5, 2) DEFAULT 10.00;

COMMENT ON COLUMN restaurants.latitude IS 'Restaurant latitude coordinate for distance calculations';
COMMENT ON COLUMN restaurants.longitude IS 'Restaurant longitude coordinate for distance calculations';
COMMENT ON COLUMN restaurants.delivery_radius_miles IS 'Maximum delivery radius in miles from restaurant location';
