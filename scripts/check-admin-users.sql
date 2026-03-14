-- Check existing admin users
SELECT 
  id,
  email,
  username,
  role,
  restaurant_id,
  created_at
FROM admin_users
ORDER BY role DESC, created_at DESC;
