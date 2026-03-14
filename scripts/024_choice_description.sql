-- Add description column to item_option_choices for choice-level help text
ALTER TABLE item_option_choices ADD COLUMN IF NOT EXISTS description text;
