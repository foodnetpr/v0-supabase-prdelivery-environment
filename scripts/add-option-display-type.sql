-- Add display_type column to item_options table
ALTER TABLE item_options 
ADD COLUMN IF NOT EXISTS display_type TEXT DEFAULT 'pills';

-- Update comment
COMMENT ON COLUMN item_options.display_type IS 'Display format: pills (default), dropdown, grid, list';
