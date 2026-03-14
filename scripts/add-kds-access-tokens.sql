-- Add KDS access tokens for direct tablet access without login
-- These tokens allow kitchen staff to access KDS via a bookmarkable URL

-- Add to branches table
ALTER TABLE branches ADD COLUMN IF NOT EXISTS kds_access_token TEXT;

-- Add to restaurants table (for non-chain restaurants)
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS kds_access_token TEXT;

-- Create index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_branches_kds_token ON branches(kds_access_token) WHERE kds_access_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_restaurants_kds_token ON restaurants(kds_access_token) WHERE kds_access_token IS NOT NULL;
