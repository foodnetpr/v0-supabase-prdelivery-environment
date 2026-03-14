-- Fix test order to be delivery type
UPDATE orders
SET 
  delivery_type = 'delivery',
  delivery_address = '123 Test Street, San Juan, PR 00901',
  delivery_fee = 15.00
WHERE customer_name = 'Test Customer'
  AND delivery_type = 'pickup';

-- Show updated order
SELECT id, order_number, customer_name, delivery_type, delivery_address, delivery_fee, status
FROM orders
WHERE customer_name = 'Test Customer';
