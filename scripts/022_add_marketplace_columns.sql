-- Add missing marketplace columns to restaurants table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS marketplace_tagline text;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;
