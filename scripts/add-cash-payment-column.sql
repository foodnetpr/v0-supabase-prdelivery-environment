-- Add cash_payment_enabled column to restaurants table
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS cash_payment_enabled BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN restaurants.cash_payment_enabled IS 'Enable cash payment option for orders';
