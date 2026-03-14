-- Add auth_user_id column to admin_users to link with Supabase Auth
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS auth_user_id uuid;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_auth_user_id ON admin_users(auth_user_id);

-- Update RLS policies to use auth_user_id
DROP POLICY IF EXISTS "Users can view own admin record" ON admin_users;
DROP POLICY IF EXISTS "Users can update own admin record" ON admin_users;

CREATE POLICY "Users can view own admin record" ON admin_users
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own admin record" ON admin_users
  FOR UPDATE USING (auth.uid() = auth_user_id);

-- Allow service role to manage admin_users (for setup and linking)
DROP POLICY IF EXISTS "Service role full access" ON admin_users;
CREATE POLICY "Service role full access" ON admin_users
  FOR ALL USING (true) WITH CHECK (true);
