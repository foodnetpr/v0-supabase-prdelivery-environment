-- Create admin accounts for restaurants using Supabase Auth
-- Generic password for all accounts: admin123
-- Users should change this password after first login

-- Create Supabase Auth users and link them to restaurants
DO $$
DECLARE
  junteready_id UUID;
  metropol_id UUID;
  junteready_user_id UUID;
  metropol_user_id UUID;
BEGIN
  -- Get restaurant IDs
  SELECT id INTO junteready_id FROM restaurants WHERE slug = 'gourmet-catering';
  SELECT id INTO metropol_id FROM restaurants WHERE slug = 'metropol-catering';

  -- Create auth users (this is a placeholder - actual user creation happens via Supabase Auth API)
  -- We'll insert directly into admin_users table with temporary user IDs
  -- These should be replaced with actual Supabase Auth user IDs after signup
  
  -- For JunteReady
  INSERT INTO admin_users (email, role, restaurant_id)
  VALUES ('admin@junteready.com', 'admin', junteready_id)
  ON CONFLICT (email) DO NOTHING;
  
  -- For Metropol Catering  
  INSERT INTO admin_users (email, role, restaurant_id)
  VALUES ('admin@metropol.com', 'admin', metropol_id)
  ON CONFLICT (email) DO NOTHING;
  
  RAISE NOTICE 'Admin accounts created. Users must sign up via Supabase Auth with these emails and password: admin123';
END $$;
