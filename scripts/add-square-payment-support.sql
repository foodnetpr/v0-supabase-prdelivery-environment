-- Add Square payment support to branches table
-- This allows each branch to choose their payment provider (Stripe, Square, or both)

-- Add payment provider selection field
ALTER TABLE branches ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'stripe';

-- Add Square credentials fields
ALTER TABLE branches ADD COLUMN IF NOT EXISTS square_access_token TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS square_location_id TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS square_environment TEXT DEFAULT 'sandbox'; -- 'sandbox' or 'production'

-- Add comment for clarity
COMMENT ON COLUMN branches.payment_provider IS 'Payment provider: stripe, square, or both';
COMMENT ON COLUMN branches.square_access_token IS 'Square Access Token for this branch';
COMMENT ON COLUMN branches.square_location_id IS 'Square Location ID for this branch';
COMMENT ON COLUMN branches.square_environment IS 'Square environment: sandbox or production';

-- Add Square payment ID to orders for tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS square_payment_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_provider TEXT;

COMMENT ON COLUMN orders.square_payment_id IS 'Square payment ID if paid via Square';
COMMENT ON COLUMN orders.payment_provider IS 'Payment provider used: stripe or square';
