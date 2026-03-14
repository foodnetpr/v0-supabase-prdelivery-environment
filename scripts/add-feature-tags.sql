-- Add feature_tags column to menu_items for descriptor badges
-- e.g. ["Mas Pedido", "Empaque Individual", "Sin Gluten"]
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS feature_tags text[] DEFAULT '{}';
