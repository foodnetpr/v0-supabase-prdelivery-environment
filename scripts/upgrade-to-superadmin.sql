-- Upgrade junteready user to super_admin role
UPDATE admin_users
SET role = 'super_admin'
WHERE username = 'junteready';

-- Verify the change
SELECT id, username, email, role, restaurant_id
FROM admin_users
WHERE username = 'junteready';
