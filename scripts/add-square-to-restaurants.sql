-- Add payment provider columns to restaurants table (for non-chain restaurants)
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'stripe';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS square_access_token TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS square_location_id TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS square_environment TEXT DEFAULT 'production';

-- Add comments
COMMENT ON COLUMN restaurants.payment_provider IS 'Payment provider: stripe, square, or both';
COMMENT ON COLUMN restaurants.stripe_account_id IS 'Stripe Connect account ID for this restaurant';
COMMENT ON COLUMN restaurants.square_access_token IS 'Square access token for this restaurant';
COMMENT ON COLUMN restaurants.square_location_id IS 'Square location ID for this restaurant';
COMMENT ON COLUMN restaurants.square_environment IS 'Square environment: sandbox or production';
