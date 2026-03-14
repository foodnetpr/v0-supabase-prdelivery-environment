-- Check junteready admin user details
SELECT 
  au.id,
  au.username,
  au.email,
  au.role,
  au.restaurant_id,
  r.name as restaurant_name,
  r.slug as restaurant_slug
FROM admin_users au
LEFT JOIN restaurants r ON au.restaurant_id = r.id
WHERE au.username = 'junteready' OR au.email ILIKE '%junteready%';
