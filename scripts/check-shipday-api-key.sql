-- Check if any Shipday API key is configured
SELECT 
  r.name as restaurant_name,
  r.slug,
  r.shipday_api_key IS NOT NULL as has_restaurant_key,
  CASE WHEN r.shipday_api_key IS NOT NULL THEN LEFT(r.shipday_api_key, 8) || '...' ELSE NULL END as restaurant_key_preview,
  b.name as branch_name,
  b.shipday_api_key IS NOT NULL as has_branch_key,
  CASE WHEN b.shipday_api_key IS NOT NULL THEN LEFT(b.shipday_api_key, 8) || '...' ELSE NULL END as branch_key_preview
FROM restaurants r
LEFT JOIN branches b ON b.restaurant_id = r.id
WHERE r.slug = 'la-cocina-criolla';
