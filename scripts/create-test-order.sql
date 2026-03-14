-- Create a test delivery order for Shipday testing
-- This uses the seeded test restaurant "La Cocina Criolla"

DO $$
DECLARE
  v_restaurant_id uuid;
  v_branch_id uuid;
  v_order_id uuid;
  v_item_id uuid;
BEGIN
  -- Get the test restaurant
  SELECT id INTO v_restaurant_id FROM restaurants WHERE slug = 'la-cocina-criolla' LIMIT 1;
  
  IF v_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Restaurant "la-cocina-criolla" not found. Please run seed-dummy-restaurants.sql first.';
  END IF;

  -- Get the branch
  SELECT id INTO v_branch_id FROM branches WHERE restaurant_id = v_restaurant_id LIMIT 1;

  -- Get a menu item
  SELECT id INTO v_item_id FROM menu_items WHERE restaurant_id = v_restaurant_id LIMIT 1;

  -- Create the order
  v_order_id := gen_random_uuid();

  INSERT INTO orders (
    id,
    restaurant_id,
    branch_id,
    customer_name,
    customer_email,
    customer_phone,
    delivery_type,
    delivery_address,
    delivery_city,
    delivery_state,
    delivery_zip,
    delivery_date,
    subtotal,
    food_subtotal,
    tax,
    delivery_fee,
    tip,
    total,
    status,
    special_instructions,
    order_source,
    order_number,
    created_at
  ) VALUES (
    v_order_id,
    v_restaurant_id,
    v_branch_id,
    'Test Customer',
    'test@example.com',
    '787-555-1234',
    'delivery',
    '123 Test Street',
    'San Juan',
    'PR',
    '00901',
    CURRENT_DATE + INTERVAL '1 day',
    45.00,
    45.00,
    5.06,
    10.00,
    6.75,
    66.81,
    'confirmed',
    'TEST ORDER for Shipday integration testing. Do not fulfill.',
    'online',
    'TEST-' || to_char(NOW(), 'YYYYMMDD-HH24MISS'),
    NOW()
  );

  -- Add order items
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
    v_item_id,
    'Arroz con Pollo (Test)',
    1,
    45.00,
    45.00
  );

  RAISE NOTICE 'Test order created with ID: %', v_order_id;
  RAISE NOTICE 'Go to /la-cocina-criolla/admin -> Orders to see and send to Shipday.';
END $$;
