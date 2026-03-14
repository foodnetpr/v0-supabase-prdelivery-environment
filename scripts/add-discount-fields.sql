-- Add restaurant discount percentage to restaurants table (JunteReady's negotiated rate)
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS restaurant_discount_percent DECIMAL DEFAULT 0;

-- Add branch-level discount override (NULL = use restaurant default)
ALTER TABLE branches
ADD COLUMN IF NOT EXISTS restaurant_discount_percent DECIMAL DEFAULT NULL;

-- Add financial tracking columns to orders
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS food_subtotal DECIMAL DEFAULT 0;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS restaurant_discount_percent DECIMAL DEFAULT 0;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS restaurant_payout DECIMAL DEFAULT 0;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS service_revenue DECIMAL DEFAULT 0;
