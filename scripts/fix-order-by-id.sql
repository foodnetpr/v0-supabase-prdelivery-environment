-- Find and fix the test order by partial ID
UPDATE orders
SET 
  delivery_type = 'delivery',
  delivery_address = '123 Calle Test, San Juan, PR 00901'
WHERE id::text LIKE '%0da468ba%'
RETURNING id, delivery_type, delivery_address, customer_name;
