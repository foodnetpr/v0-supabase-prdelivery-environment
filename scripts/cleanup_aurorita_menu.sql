-- Clean up menu items, categories, and item types that were incorrectly 
-- copied from Metropol to Aurorita. Keep service packages and delivery rates.

-- First, delete option choices for Aurorita's menu items
DELETE FROM item_option_choices
WHERE item_option_id IN (
  SELECT io.id FROM item_options io
  JOIN menu_items mi ON io.menu_item_id = mi.id
  JOIN restaurants r ON mi.restaurant_id = r.id
  WHERE r.slug = 'aurorita'
);

-- Delete item options for Aurorita's menu items
DELETE FROM item_options
WHERE menu_item_id IN (
  SELECT mi.id FROM menu_items mi
  JOIN restaurants r ON mi.restaurant_id = r.id
  WHERE r.slug = 'aurorita'
);

-- Delete item sizes for Aurorita's menu items
DELETE FROM item_sizes
WHERE menu_item_id IN (
  SELECT mi.id FROM menu_items mi
  JOIN restaurants r ON mi.restaurant_id = r.id
  WHERE r.slug = 'aurorita'
);

-- Delete all menu items for Aurorita
DELETE FROM menu_items
WHERE restaurant_id IN (
  SELECT id FROM restaurants WHERE slug = 'aurorita'
);

-- Delete all categories for Aurorita
DELETE FROM categories
WHERE restaurant_id IN (
  SELECT id FROM restaurants WHERE slug = 'aurorita'
);

-- Delete all item types for Aurorita
DELETE FROM item_types
WHERE restaurant_id IN (
  SELECT id FROM restaurants WHERE slug = 'aurorita'
);
