-- Add side dish choices for all Metropol "Por favor Seleccione 2:" options
-- These options exist but have no choices, so customers can't complete orders

-- First, create a temporary table with the standard side dishes for Metropol
DO $$
DECLARE
  option_record RECORD;
  choice_order INT;
BEGIN
  -- Loop through all Metropol options that need choices
  FOR option_record IN 
    SELECT io.id as option_id
    FROM item_options io
    JOIN menu_items mi ON mi.id = io.menu_item_id
    JOIN restaurants r ON r.id = mi.restaurant_id
    WHERE r.name ILIKE '%metropol%'
      AND io.category ILIKE '%seleccione%'
      AND (SELECT COUNT(*) FROM item_option_choices WHERE item_option_id = io.id) = 0
  LOOP
    choice_order := 0;
    
    -- Insert standard Cuban side dish choices for each option
    INSERT INTO item_option_choices (id, item_option_id, name, price_modifier, display_order, is_available)
    VALUES 
      (gen_random_uuid(), option_record.option_id, 'Arroz Blanco', 0, choice_order + 1, true),
      (gen_random_uuid(), option_record.option_id, 'Arroz Amarillo', 0, choice_order + 2, true),
      (gen_random_uuid(), option_record.option_id, 'Arroz Congri', 0, choice_order + 3, true),
      (gen_random_uuid(), option_record.option_id, 'Frijoles Negros', 0, choice_order + 4, true),
      (gen_random_uuid(), option_record.option_id, 'Tostones', 0, choice_order + 5, true),
      (gen_random_uuid(), option_record.option_id, 'Maduros', 0, choice_order + 6, true),
      (gen_random_uuid(), option_record.option_id, 'Yuca Frita', 0, choice_order + 7, true),
      (gen_random_uuid(), option_record.option_id, 'Yuca al Mojo', 0, choice_order + 8, true),
      (gen_random_uuid(), option_record.option_id, 'Papas Fritas', 0, choice_order + 9, true),
      (gen_random_uuid(), option_record.option_id, 'Ensalada Verde', 0, choice_order + 10, true),
      (gen_random_uuid(), option_record.option_id, 'Ensalada de Tomate', 0, choice_order + 11, true),
      (gen_random_uuid(), option_record.option_id, 'Platano en Tentacion', 0, choice_order + 12, true);
  END LOOP;
  
  RAISE NOTICE 'Successfully added side dish choices for Metropol options';
END $$;

-- Verify the results
SELECT 
  r.name as restaurant,
  COUNT(DISTINCT io.id) as options_with_choices,
  COUNT(DISTINCT ioc.id) as total_choices_added
FROM restaurants r
JOIN menu_items mi ON mi.restaurant_id = r.id
JOIN item_options io ON io.menu_item_id = mi.id
JOIN item_option_choices ioc ON ioc.item_option_id = io.id
WHERE r.name ILIKE '%metropol%'
  AND io.category ILIKE '%seleccione%'
GROUP BY r.name;
