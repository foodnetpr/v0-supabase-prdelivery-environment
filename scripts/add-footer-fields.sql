-- Add footer fields to restaurants table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS footer_description TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS footer_email TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS footer_phone TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS footer_links JSONB DEFAULT '[]'::jsonb;
