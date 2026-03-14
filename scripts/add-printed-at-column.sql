-- Add printed_at column to orders table for auto-print deduplication
-- This prevents multiple KDS devices from auto-printing the same order

ALTER TABLE orders ADD COLUMN IF NOT EXISTS printed_at TIMESTAMPTZ DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN orders.printed_at IS 'Timestamp when order was auto-printed. Used to prevent duplicate printing across multiple KDS devices.';
