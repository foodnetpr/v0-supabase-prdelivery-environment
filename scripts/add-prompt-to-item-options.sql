-- Migration: add prompt column to item_options
-- This stores the customer-facing question text for each option group
ALTER TABLE item_options ADD COLUMN IF NOT EXISTS prompt text;
