-- Admin users table for super admin and restaurant admins
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'restaurant_admin', -- 'super_admin' or 'restaurant_admin'
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE, -- NULL for super admins
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can view their own admin record
CREATE POLICY "Users can view own admin record"
  ON public.admin_users FOR SELECT
  USING (auth.uid() = id);

-- Only authenticated users can update their own record
CREATE POLICY "Users can update own admin record"
  ON public.admin_users FOR UPDATE
  USING (auth.uid() = id);

CREATE INDEX idx_admin_users_restaurant ON public.admin_users(restaurant_id);
CREATE INDEX idx_admin_users_role ON public.admin_users(role);
