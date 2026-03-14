-- Add separate delivery and pickup discount percentages
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS delivery_discount_percent DECIMAL DEFAULT NULL;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS pickup_discount_percent DECIMAL DEFAULT NULL;

ALTER TABLE branches ADD COLUMN IF NOT EXISTS delivery_discount_percent DECIMAL DEFAULT NULL;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS pickup_discount_percent DECIMAL DEFAULT NULL;
