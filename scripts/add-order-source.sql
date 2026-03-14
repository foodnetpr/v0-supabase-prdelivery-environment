-- Add order_source column to orders table to distinguish online vs phone orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_source TEXT DEFAULT 'online';

-- Add index for filtering by order source
CREATE INDEX IF NOT EXISTS idx_orders_order_source ON orders(order_source);
