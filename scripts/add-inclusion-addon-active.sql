-- Add is_active to package_inclusions and package_addons
ALTER TABLE package_inclusions ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE package_addons ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
