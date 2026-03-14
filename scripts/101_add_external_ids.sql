-- Add external_id columns for import/export functionality
-- These store IDs from external systems (e.g., POS, third-party platforms)

-- Add external_id to restaurants
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS external_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurants_external_id 
ON restaurants(external_id) WHERE external_id IS NOT NULL;

-- Add external_id to categories (with unique constraint per restaurant)
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS external_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_restaurant_external 
ON categories(restaurant_id, external_id) WHERE external_id IS NOT NULL;

-- Add external_id to menu_items (with unique constraint per restaurant)
ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS external_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_menu_items_restaurant_external 
ON menu_items(restaurant_id, external_id) WHERE external_id IS NOT NULL;

-- Add external_id to item_options (with unique constraint per menu item)
ALTER TABLE item_options 
ADD COLUMN IF NOT EXISTS external_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_item_options_item_external 
ON item_options(menu_item_id, external_id) WHERE external_id IS NOT NULL;

-- Add external_id to item_option_choices (with unique constraint per option)
ALTER TABLE item_option_choices 
ADD COLUMN IF NOT EXISTS external_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_item_option_choices_option_external 
ON item_option_choices(item_option_id, external_id) WHERE external_id IS NOT NULL;
