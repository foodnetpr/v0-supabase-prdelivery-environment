-- Add missing columns to menu_items that the admin code references
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_bulk_order boolean DEFAULT false;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS quantity_unit text;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS minimum_quantity integer;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_cart_upsell boolean DEFAULT false;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS lead_time_hours integer;
