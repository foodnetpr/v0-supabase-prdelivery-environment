-- Rename dispatch_fee (flat) to dispatch_fee_percent (% of subtotal)
ALTER TABLE restaurants
  RENAME COLUMN dispatch_fee TO dispatch_fee_percent;

-- Change default and comment
ALTER TABLE restaurants
  ALTER COLUMN dispatch_fee_percent SET DEFAULT 0;

COMMENT ON COLUMN restaurants.dispatch_fee_percent IS 'Dispatch fee as a percentage of the order subtotal, shown as a line item in the customer cart';

-- tax_rate column stores the decimal multiplier (e.g. 0.115 = 11.5%)
-- Widen the column to numeric(6,4) to safely hold values like 0.1150
ALTER TABLE restaurants
  ALTER COLUMN tax_rate TYPE numeric(6,4);

-- Set 11.5% (stored as 0.115) for all restaurants that have 0 or NULL
UPDATE restaurants
  SET tax_rate = 0.115
  WHERE tax_rate IS NULL OR tax_rate = 0;

-- Ensure future restaurants default to 11.5%
ALTER TABLE restaurants
  ALTER COLUMN tax_rate SET DEFAULT 0.115;
