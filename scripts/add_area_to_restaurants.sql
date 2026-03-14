-- Add area column to restaurants for neighborhood/zone filtering
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS area TEXT;
