-- Add banner_logo_url column to restaurants table for the rectangular portal header logo
-- Separate from logo_url which is the square marketplace tile logo
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS banner_logo_url text;

-- Also add to branches table for branch-level override
ALTER TABLE branches ADD COLUMN IF NOT EXISTS banner_logo_url text;
