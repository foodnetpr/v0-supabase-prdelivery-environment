-- Add area column to branches table for per-branch marketplace area/zone
ALTER TABLE branches ADD COLUMN IF NOT EXISTS area text;
