-- Check actual delivery_type values in orders
SELECT 
  id,
  order_number,
  customer_name,
  delivery_type,
  delivery_address,
  created_at
FROM orders
ORDER BY created_at DESC
LIMIT 5;
