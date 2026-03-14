-- Seed Dummy Restaurants for Testing Checkout Flow
-- This script creates 2 complete restaurants with all related data

-- First, add cuisine types if they don't exist
INSERT INTO cuisine_types (id, name, display_order, is_active) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Comida Criolla', 1, true),
  ('22222222-2222-2222-2222-222222222222', 'Mexican', 2, true)
ON CONFLICT (id) DO NOTHING;

-- Add marketplace areas if they don't exist
INSERT INTO marketplace_areas (id, name, display_order, is_active) VALUES
  ('aaaa1111-1111-1111-1111-111111111111', 'San Juan', 1, true),
  ('aaaa2222-2222-2222-2222-222222222222', 'Bayamon', 2, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- RESTAURANT 1: La Cocina Criolla
-- ============================================
INSERT INTO restaurants (
  id, slug, name, logo_url, primary_color, 
  is_active, show_in_marketplace, cuisine_type, area,
  tax_rate, tip_option_1, tip_option_2, tip_option_3,
  delivery_enabled, delivery_fee, min_delivery_order, min_pickup_order,
  lead_time_hours, max_advance_days, design_template,
  address, city, state, zip, phone, email,
  marketplace_tagline, footer_description, footer_phone, footer_email
) VALUES (
  'a1111111-1111-1111-1111-111111111111',
  'la-cocina-criolla',
  'La Cocina Criolla',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&h=200&fit=crop',
  '#8B4513',
  true, true, 'Comida Criolla', 'San Juan',
  0.115, 15, 18, 20,
  true, 15.00, 75.00, 50.00,
  24, 30, 'modern',
  '123 Calle Fortaleza', 'San Juan', 'PR', '00901', '787-555-0101', 'info@lacocinacriolla.com',
  'Autentica comida puertorriquena para tus eventos',
  'La mejor comida criolla de Puerto Rico.',
  '787-555-0101', 'pedidos@lacocinacriolla.com'
) ON CONFLICT (id) DO UPDATE SET is_active = true;

-- Branch for Restaurant 1
INSERT INTO branches (
  id, restaurant_id, slug, name, is_active,
  address, city, state, zip, phone, email,
  delivery_enabled, pickup_enabled,
  delivery_fee, min_delivery_order, min_pickup_order,
  tax_rate, tip_option_1, tip_option_2, tip_option_3,
  lead_time_hours, delivery_lead_time_hours, pickup_lead_time_hours,
  max_advance_days, design_template, primary_color,
  latitude, longitude, delivery_radius, area
) VALUES (
  'b1111111-1111-1111-1111-111111111111',
  'a1111111-1111-1111-1111-111111111111',
  'san-juan',
  'San Juan - Viejo San Juan',
  true,
  '123 Calle Fortaleza', 'San Juan', 'PR', '00901', '787-555-0101', 'sanjuan@lacocinacriolla.com',
  true, true,
  15.00, 75.00, 50.00,
  0.115, 15, 18, 20,
  24, 24, 12,
  30, 'modern', '#8B4513',
  18.4655, -66.1057, 15.0, 'San Juan'
) ON CONFLICT (id) DO UPDATE SET is_active = true;

-- Categories for Restaurant 1
INSERT INTO categories (id, restaurant_id, name, description, display_order, is_active) VALUES
  ('c1111111-0001-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'Bandejas', 'Bandejas completas para eventos', 1, true),
  ('c1111111-0002-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'Empanadillitas', 'Empanadillas mixtas por unidad', 2, true),
  ('c1111111-0003-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'Bebidas', 'Refrescos y bebidas', 3, true)
ON CONFLICT (id) DO UPDATE SET is_active = true;

-- Menu Items for Restaurant 1
INSERT INTO menu_items (
  id, restaurant_id, category_id, name, description,
  price, pricing_unit, quantity_unit, serves,
  min_quantity, is_active, display_order, container_type
) VALUES (
  'e1111111-0001-1111-1111-111111111111',
  'a1111111-1111-1111-1111-111111111111',
  'c1111111-0001-1111-1111-111111111111',
  'Arroz con Pollo',
  'Delicioso arroz con pollo al estilo puertorriqueno.',
  45.00, 'tray', 'bandejas', '12-15',
  1, true, 1, 'heavy_tray'
) ON CONFLICT (id) DO UPDATE SET is_active = true;

INSERT INTO menu_items (
  id, restaurant_id, category_id, name, description,
  price, pricing_unit, quantity_unit, serves,
  min_quantity, is_active, display_order, container_type
) VALUES (
  'e1111111-0002-1111-1111-111111111111',
  'a1111111-1111-1111-1111-111111111111',
  'c1111111-0001-1111-1111-111111111111',
  'Pernil Asado',
  'Cerdo asado marinado con adobo criollo.',
  65.00, 'tray', 'bandejas', '15-20',
  1, true, 2, 'heavy_tray'
) ON CONFLICT (id) DO UPDATE SET is_active = true;

-- Empanadillitas with counter option
INSERT INTO menu_items (
  id, restaurant_id, category_id, name, description,
  price, pricing_unit, quantity_unit, per_unit_price,
  min_quantity, is_active, display_order, serves
) VALUES (
  'e1111111-0003-1111-1111-111111111111',
  'a1111111-1111-1111-1111-111111111111',
  'c1111111-0002-1111-1111-111111111111',
  'Empanadillitas Mixtas',
  'Variedad de empanadillas. Minimo 15 unidades.',
  52.50, 'each', 'unidades', 3.50,
  15, true, 1, '15'
) ON CONFLICT (id) DO UPDATE SET is_active = true;

-- Counter option for empanadillitas
INSERT INTO item_options (
  id, menu_item_id, category, display_type, is_required,
  min_selection, max_selection, display_order
) VALUES (
  'f1111111-0001-1111-1111-111111111111',
  'e1111111-0003-1111-1111-111111111111',
  'Selecciona tus sabores:',
  'counter', true,
  15, 999, 1
) ON CONFLICT (id) DO NOTHING;

INSERT INTO item_option_choices (id, item_option_id, name, price_modifier, display_order) VALUES
  ('d1111111-0001-1111-1111-111111111111', 'f1111111-0001-1111-1111-111111111111', 'de Carne', 0, 1),
  ('d1111111-0002-1111-1111-111111111111', 'f1111111-0001-1111-1111-111111111111', 'de Pollo', 0, 2),
  ('d1111111-0003-1111-1111-111111111111', 'f1111111-0001-1111-1111-111111111111', 'de Queso', 0, 3),
  ('d1111111-0004-1111-1111-111111111111', 'f1111111-0001-1111-1111-111111111111', 'de Pizza', 0, 4),
  ('d1111111-0005-1111-1111-111111111111', 'f1111111-0001-1111-1111-111111111111', 'de Jueyes', 0.50, 5)
ON CONFLICT (id) DO NOTHING;

-- Coquito
INSERT INTO menu_items (
  id, restaurant_id, category_id, name, description,
  price, pricing_unit, quantity_unit, serves,
  min_quantity, is_active, display_order
) VALUES (
  'e1111111-0004-1111-1111-111111111111',
  'a1111111-1111-1111-1111-111111111111',
  'c1111111-0003-1111-1111-111111111111',
  'Coquito',
  'Bebida tradicional navidena a base de coco y ron.',
  25.00, 'botella_750ml', 'botellas', '8-10',
  1, true, 1
) ON CONFLICT (id) DO UPDATE SET is_active = true;

-- Service Package
INSERT INTO service_packages (
  id, restaurant_id, name, description, base_price, 
  display_order, is_active
) VALUES (
  'ab111111-0001-1111-1111-111111111111',
  'a1111111-1111-1111-1111-111111111111',
  'Servicio Basico',
  'Setup de mesas y entrega',
  50.00, 1, true
) ON CONFLICT (id) DO UPDATE SET is_active = true;

INSERT INTO package_inclusions (id, package_id, description, display_order, is_active) VALUES
  ('ac111111-0001-1111-1111-111111111111', 'ab111111-0001-1111-1111-111111111111', 'Entrega en el lugar', 1, true),
  ('ac111111-0002-1111-1111-111111111111', 'ab111111-0001-1111-1111-111111111111', 'Setup de bandejas', 2, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO branch_service_packages (id, branch_id, package_id) VALUES
  ('ad111111-0001-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'ab111111-0001-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;


-- ============================================
-- RESTAURANT 2: Taqueria El Sol
-- ============================================
INSERT INTO restaurants (
  id, slug, name, logo_url, primary_color, 
  is_active, show_in_marketplace, cuisine_type, area,
  tax_rate, tip_option_1, tip_option_2, tip_option_3,
  delivery_enabled, delivery_fee, min_delivery_order, min_pickup_order,
  lead_time_hours, max_advance_days, design_template,
  address, city, state, zip, phone, email,
  marketplace_tagline, footer_description, footer_phone, footer_email
) VALUES (
  'a2222222-2222-2222-2222-222222222222',
  'taqueria-el-sol',
  'Taqueria El Sol',
  'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=200&h=200&fit=crop',
  '#FF6B35',
  true, true, 'Mexican', 'Bayamon',
  0.115, 15, 18, 20,
  true, 12.00, 60.00, 40.00,
  12, 21, 'bold',
  '456 Ave Principal', 'Bayamon', 'PR', '00961', '787-555-0202', 'info@taqueriaelsol.com',
  'Tacos, burritos y mas para tu fiesta',
  'Comida mexicana autentica.',
  '787-555-0202', 'pedidos@taqueriaelsol.com'
) ON CONFLICT (id) DO UPDATE SET is_active = true;

-- Branch for Restaurant 2
INSERT INTO branches (
  id, restaurant_id, slug, name, is_active,
  address, city, state, zip, phone, email,
  delivery_enabled, pickup_enabled,
  delivery_fee, min_delivery_order, min_pickup_order,
  tax_rate, tip_option_1, tip_option_2, tip_option_3,
  lead_time_hours, delivery_lead_time_hours, pickup_lead_time_hours,
  max_advance_days, design_template, primary_color,
  latitude, longitude, delivery_radius, area
) VALUES (
  'b2222222-2222-2222-2222-222222222222',
  'a2222222-2222-2222-2222-222222222222',
  'bayamon',
  'Bayamon Centro',
  true,
  '456 Ave Principal', 'Bayamon', 'PR', '00961', '787-555-0202', 'bayamon@taqueriaelsol.com',
  true, true,
  12.00, 60.00, 40.00,
  0.115, 15, 18, 20,
  12, 12, 6,
  21, 'bold', '#FF6B35',
  18.3985, -66.1568, 12.0, 'Bayamon'
) ON CONFLICT (id) DO UPDATE SET is_active = true;

-- Categories for Restaurant 2
INSERT INTO categories (id, restaurant_id, name, description, display_order, is_active) VALUES
  ('c2222222-0001-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 'Tacos', 'Tacos por docena', 1, true),
  ('c2222222-0002-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 'Burritos', 'Burritos grandes', 2, true),
  ('c2222222-0003-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 'Sides', 'Acompanantes', 3, true)
ON CONFLICT (id) DO UPDATE SET is_active = true;

-- Menu Items for Restaurant 2
INSERT INTO menu_items (
  id, restaurant_id, category_id, name, description,
  price, pricing_unit, quantity_unit, serves,
  min_quantity, is_active, display_order
) VALUES (
  'e2222222-0001-2222-2222-222222222222',
  'a2222222-2222-2222-2222-222222222222',
  'c2222222-0001-2222-2222-222222222222',
  'Tacos de Carnitas (Docena)',
  '12 tacos de carnitas con cilantro, cebolla y salsa verde.',
  36.00, 'box', 'cajas', '4-6',
  1, true, 1
) ON CONFLICT (id) DO UPDATE SET is_active = true;

-- Salsa option for tacos
INSERT INTO item_options (
  id, menu_item_id, category, display_type, is_required,
  min_selection, max_selection, display_order
) VALUES (
  'f2222222-0001-2222-2222-222222222222',
  'e2222222-0001-2222-2222-222222222222',
  'Selecciona tu salsa:',
  'dropdown', false,
  0, 1, 1
) ON CONFLICT (id) DO NOTHING;

INSERT INTO item_option_choices (id, item_option_id, name, price_modifier, display_order) VALUES
  ('d2222222-0001-2222-2222-222222222222', 'f2222222-0001-2222-2222-222222222222', 'Salsa Verde', 0, 1),
  ('d2222222-0002-2222-2222-222222222222', 'f2222222-0001-2222-2222-222222222222', 'Salsa Roja', 0, 2),
  ('d2222222-0003-2222-2222-222222222222', 'f2222222-0001-2222-2222-222222222222', 'Salsa Habanero (+$2)', 2.00, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_items (
  id, restaurant_id, category_id, name, description,
  price, pricing_unit, quantity_unit, serves,
  min_quantity, is_active, display_order
) VALUES (
  'e2222222-0002-2222-2222-222222222222',
  'a2222222-2222-2222-2222-222222222222',
  'c2222222-0001-2222-2222-222222222222',
  'Tacos de Pollo (Docena)',
  '12 tacos de pollo marinado con pico de gallo.',
  32.00, 'box', 'cajas', '4-6',
  1, true, 2
) ON CONFLICT (id) DO UPDATE SET is_active = true;

-- Burrito with protein option
INSERT INTO menu_items (
  id, restaurant_id, category_id, name, description,
  price, pricing_unit, quantity_unit, serves,
  min_quantity, is_active, display_order
) VALUES (
  'e2222222-0003-2222-2222-222222222222',
  'a2222222-2222-2222-2222-222222222222',
  'c2222222-0002-2222-2222-222222222222',
  'Burrito Grande',
  'Burrito XXL con arroz, frijoles, carne, queso y crema.',
  14.00, 'each', 'unidades', '1',
  1, true, 1
) ON CONFLICT (id) DO UPDATE SET is_active = true;

INSERT INTO item_options (
  id, menu_item_id, category, display_type, is_required,
  min_selection, max_selection, display_order
) VALUES (
  'f2222222-0002-2222-2222-222222222222',
  'e2222222-0003-2222-2222-222222222222',
  'Selecciona proteina:',
  'list', true,
  1, 1, 1
) ON CONFLICT (id) DO NOTHING;

INSERT INTO item_option_choices (id, item_option_id, name, price_modifier, display_order) VALUES
  ('d2222222-0004-2222-2222-222222222222', 'f2222222-0002-2222-2222-222222222222', 'Pollo', 0, 1),
  ('d2222222-0005-2222-2222-222222222222', 'f2222222-0002-2222-2222-222222222222', 'Carnitas', 0, 2),
  ('d2222222-0006-2222-2222-222222222222', 'f2222222-0002-2222-2222-222222222222', 'Carne Asada (+$3)', 3.00, 3),
  ('d2222222-0007-2222-2222-222222222222', 'f2222222-0002-2222-2222-222222222222', 'Camaron (+$5)', 5.00, 4)
ON CONFLICT (id) DO NOTHING;

-- Guacamole
INSERT INTO menu_items (
  id, restaurant_id, category_id, name, description,
  price, pricing_unit, quantity_unit, serves,
  min_quantity, is_active, display_order
) VALUES (
  'e2222222-0004-2222-2222-222222222222',
  'a2222222-2222-2222-2222-222222222222',
  'c2222222-0003-2222-2222-222222222222',
  'Guacamole con Totopos',
  'Guacamole fresco con totopos de maiz.',
  18.00, 'bowl_16oz', 'bowls 16oz', '6-8',
  1, true, 1
) ON CONFLICT (id) DO UPDATE SET is_active = true;

-- Marketplace Settings
INSERT INTO marketplace_settings (id, hero_title, hero_subtitle, hero_image_url) VALUES
  ('ae111111-1111-1111-1111-111111111111', 
   'Catering para tu Junte', 
   'Encuentra el mejor catering para tu evento en Puerto Rico',
   'https://images.unsplash.com/photo-1555244162-803834f70033?w=1200&h=600&fit=crop')
ON CONFLICT (id) DO NOTHING;

-- Delivery Zones
INSERT INTO delivery_zones (id, restaurant_id, name, zip_codes, delivery_fee, min_order, display_order, is_active) VALUES
  ('af111111-0001-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'San Juan Metro', ARRAY['00901', '00902', '00907', '00909', '00911'], 10.00, 75.00, 1, true),
  ('af222222-0001-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 'Bayamon Area', ARRAY['00956', '00957', '00959', '00960', '00961'], 8.00, 60.00, 1, true)
ON CONFLICT (id) DO NOTHING;
