-- Add show_service_packages column to restaurants table
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS show_service_packages BOOLEAN DEFAULT true;

-- Set default value for existing restaurants
UPDATE restaurants 
SET show_service_packages = true 
WHERE show_service_packages IS NULL;
