-- Add min_pickup_order to restaurants and branches
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS min_pickup_order numeric DEFAULT NULL;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS min_pickup_order numeric DEFAULT NULL;
