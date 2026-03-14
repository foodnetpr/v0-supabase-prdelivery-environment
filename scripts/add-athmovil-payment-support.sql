-- Add ATH Móvil payment support columns to branches table
ALTER TABLE branches ADD COLUMN IF NOT EXISTS athmovil_public_token TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS athmovil_ecommerce_id TEXT;

-- Add ATH Móvil payment support columns to restaurants table  
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS athmovil_public_token TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS athmovil_ecommerce_id TEXT;

-- Add ATH Móvil payment tracking to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS athmovil_reference_number TEXT;

-- Update payment_provider check constraint to include athmovil
-- First drop existing constraint if it exists, then add new one
DO $$
BEGIN
  ALTER TABLE branches DROP CONSTRAINT IF EXISTS branches_payment_provider_check;
  ALTER TABLE restaurants DROP CONSTRAINT IF EXISTS restaurants_payment_provider_check;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Note: We'll allow any value for payment_provider since we're using it as a flexible field
-- Values can be: 'stripe', 'square', 'athmovil', 'stripe+athmovil', 'square+athmovil', 'all', etc.
