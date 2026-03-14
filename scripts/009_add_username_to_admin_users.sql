-- Add username column to admin_users table
ALTER TABLE public.admin_users 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Add index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_username 
ON public.admin_users(username);

-- Add comment for clarity
COMMENT ON COLUMN public.admin_users.username IS 'Username for login (alternative to email)';
