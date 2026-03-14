-- Add delivery_enabled and show_service_packages columns to restaurants table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS delivery_enabled BOOLEAN DEFAULT true;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS show_service_packages BOOLEAN DEFAULT false;
