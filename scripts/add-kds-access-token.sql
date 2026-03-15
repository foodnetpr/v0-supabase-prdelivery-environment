-- Add kds_access_token to restaurants table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS kds_access_token TEXT;
