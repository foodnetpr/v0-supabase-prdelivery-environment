-- Create Admin Users for Test Restaurants
-- NOTE: This only creates the admin_users entries.
-- The actual Supabase Auth user must be created via:
-- 1. Supabase Dashboard > Authentication > Users > Add User
-- 2. Or sign up at /auth/signup (if you have that route)

-- For La Cocina Criolla
-- First, you need to create a user in Supabase Auth with email: admin@lacocinacriolla.com
-- Then copy the user's UUID and use it below

-- INSTRUCTIONS:
-- 1. Go to your Supabase Dashboard > Authentication > Users
-- 2. Click "Add User" and create:
--    - Email: admin@lacocinacriolla.com
--    - Password: TestAdmin123!
-- 3. Copy the user's ID (UUID)
-- 4. Replace 'YOUR_USER_UUID_HERE' below with that UUID
-- 5. Run this script

-- Example (replace with real UUID after creating user in Supabase):
-- INSERT INTO admin_users (id, email, role, restaurant_id, name, created_at)
-- VALUES (
--   'YOUR_USER_UUID_HERE',
--   'admin@lacocinacriolla.com',
--   'restaurant_admin',
--   'a1111111-1111-1111-1111-111111111111',
--   'Admin La Cocina',
--   NOW()
-- );

-- For Super Admin access to all restaurants:
-- INSERT INTO admin_users (id, email, role, restaurant_id, name, created_at)
-- VALUES (
--   'YOUR_SUPER_ADMIN_UUID_HERE',
--   'superadmin@junteready.com',
--   'super_admin',
--   NULL,
--   'Super Admin',
--   NOW()
-- );

SELECT 'Please follow the instructions in this file to create admin users.' AS message;
