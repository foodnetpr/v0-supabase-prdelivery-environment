-- Add fields to menu_items for bulk ordering (box lunches, etc.)
ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS min_quantity INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS pricing_unit TEXT DEFAULT 'item', -- 'item', 'person', 'box'
ADD COLUMN IF NOT EXISTS per_unit_price NUMERIC DEFAULT NULL;

-- Update existing items to use 'item' pricing
UPDATE menu_items SET pricing_unit = 'item' WHERE pricing_unit IS NULL;
