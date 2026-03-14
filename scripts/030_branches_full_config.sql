-- Add full restaurant-equivalent configuration columns to branches
ALTER TABLE branches ADD COLUMN IF NOT EXISTS tax_rate numeric(5,2);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS tip_option_1 numeric(5,2);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS tip_option_2 numeric(5,2);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS tip_option_3 numeric(5,2);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS primary_color text;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS design_template text;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS standalone_domain text;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS show_service_packages boolean;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS packages_section_title text;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS min_delivery_order numeric(10,2);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS lead_time_hours integer;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS restaurant_address text;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS delivery_zones_enabled boolean DEFAULT true;
