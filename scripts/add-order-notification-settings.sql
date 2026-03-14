-- Add order notification settings to restaurants table
-- This allows restaurants to choose how they receive orders: email, KDS, Chowly, Square KDS, or multiple

-- Order notification method (can be comma-separated for multiple: "email,kds")
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS order_notification_method TEXT DEFAULT 'email';

-- Chowly POS Integration settings
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS chowly_enabled BOOLEAN DEFAULT false;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS chowly_api_key TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS chowly_location_id TEXT;

-- Square KDS Integration settings (uses existing Square credentials)
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS square_kds_enabled BOOLEAN DEFAULT false;

-- KDS settings
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS kds_enabled BOOLEAN DEFAULT false;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS kds_auto_print BOOLEAN DEFAULT false;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS kds_sound_enabled BOOLEAN DEFAULT true;

-- Add same columns to branches table for per-branch configuration
ALTER TABLE branches ADD COLUMN IF NOT EXISTS order_notification_method TEXT DEFAULT 'email';
ALTER TABLE branches ADD COLUMN IF NOT EXISTS chowly_enabled BOOLEAN DEFAULT false;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS chowly_api_key TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS chowly_location_id TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS square_kds_enabled BOOLEAN DEFAULT false;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS kds_enabled BOOLEAN DEFAULT false;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS kds_auto_print BOOLEAN DEFAULT false;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS kds_sound_enabled BOOLEAN DEFAULT true;

-- Add order status tracking fields to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS kds_status TEXT DEFAULT 'new'; -- new, preparing, ready, completed
ALTER TABLE orders ADD COLUMN IF NOT EXISTS kds_acknowledged_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS kds_started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS kds_ready_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS kds_completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS chowly_order_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS square_order_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS printed_at TIMESTAMP WITH TIME ZONE;

-- Add comments for documentation
COMMENT ON COLUMN restaurants.order_notification_method IS 'How restaurant receives orders: email, kds, chowly, square_kds (comma-separated for multiple)';
COMMENT ON COLUMN restaurants.chowly_enabled IS 'Whether Chowly POS integration is enabled';
COMMENT ON COLUMN restaurants.chowly_api_key IS 'Chowly API key for this restaurant';
COMMENT ON COLUMN restaurants.chowly_location_id IS 'Chowly location/store ID';
COMMENT ON COLUMN restaurants.square_kds_enabled IS 'Whether to send orders to Square KDS';
COMMENT ON COLUMN restaurants.kds_enabled IS 'Whether the built-in KDS is enabled';
COMMENT ON COLUMN orders.kds_status IS 'Kitchen display status: new, preparing, ready, completed';
