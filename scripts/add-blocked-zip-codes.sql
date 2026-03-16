-- Add blocked_zip_codes array to platform_settings
-- Used to temporarily block delivery to certain zip codes (e.g. during marathons, events)
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS blocked_zip_codes text[] DEFAULT '{}';
