-- Add is_cart_upsell to service_packages and package_addons
-- Controls which items appear in the "Upgrades" section of the checkout cart

ALTER TABLE service_packages ADD COLUMN IF NOT EXISTS is_cart_upsell boolean DEFAULT false;
ALTER TABLE package_addons ADD COLUMN IF NOT EXISTS is_cart_upsell boolean DEFAULT false;
