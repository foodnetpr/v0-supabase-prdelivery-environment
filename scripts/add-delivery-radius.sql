-- Add lat/lng and delivery_radius to branches
ALTER TABLE branches ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS delivery_radius DECIMAL(5,1) DEFAULT 7.0;

-- Add delivery_radius to restaurants as a fallback default
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS delivery_radius DECIMAL(5,1) DEFAULT 7.0;
