-- Create a brand new delivery order for testing Shipday
DO $$
DECLARE
  v_restaurant_id UUID;
  v_branch_id UUID;
  v_order_id UUID := gen_random_uuid();
  v_menu_item_id UUID;
BEGIN
  -- Get La Cocina Criolla restaurant
  SELECT id INTO v_restaurant_id FROM restaurants WHERE slug = 'la-cocina-criolla';
  IF v_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Restaurant la-cocina-criolla not found';
  END IF;

  -- Get the branch
  SELECT id INTO v_branch_id FROM branches WHERE restaurant_id = v_restaurant_id LIMIT 1;

  -- Get a menu item
  SELECT id INTO v_menu_item_id FROM menu_items WHERE restaurant_id = v_restaurant_id LIMIT 1;

  -- Delete old problematic test orders
  DELETE FROM order_items WHERE order_id IN (
    SELECT id FROM orders WHERE customer_email = 'test@example.com' AND restaurant_id = v_restaurant_id
  );
  DELETE FROM orders WHERE customer_email = 'test@example.com' AND restaurant_id = v_restaurant_id;

  -- Insert new delivery order
  INSERT INTO orders (
    id,
    restaurant_id,
    branch_id,
    customer_name,
    customer_email,
    customer_phone,
    delivery_type,
    delivery_address,
    delivery_date,
    status,
    subtotal,
    tax,
    delivery_fee,
    total,
    order_source,
    order_number,
    created_at
  ) VALUES (
    v_order_id,
    v_restaurant_id,
    v_branch_id,
    'Maria Garcia',
    'maria.test@example.com',
    '787-555-1234',
    'delivery',
    '123 Calle Sol, San Juan, PR 00901',
    (CURRENT_DATE + INTERVAL '1 day')::timestamp + TIME '14:00:00',
    'confirmed',
    45.00,
    5.06,
    8.00,
    58.06,
    'online',
    'DEL-' || to_char(NOW(), 'YYYYMMDD-HH24MISS'),
    NOW()
  );

  -- Insert order item
  INSERT INTO order_items (
    id,
    order_id,
    menu_item_id,
    item_name,
    quantity,
    unit_price,
    total_price
  ) VALUES (
    gen_random_uuid(),
    v_order_id,
    v_menu_item_id,
    'Arroz con Pollo',
    1,
    45.00,
    45.00
  );

  RAISE NOTICE 'Created new delivery order: %', v_order_id;
END $$;
