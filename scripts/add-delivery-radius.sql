-- Add delivery_radius to restaurants
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS delivery_radius DECIMAL(5,1) DEFAULT 7.0;
