-- Fix: add the missing delivery_included_containers column
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS delivery_included_containers INTEGER DEFAULT 4;

ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS delivery_included_containers INTEGER DEFAULT NULL;

-- Fix: add extra_fee_per_unit column to delivery_container_rates
-- (the migration created extra_rate but the code references extra_fee_per_unit)
ALTER TABLE delivery_container_rates
  ADD COLUMN IF NOT EXISTS extra_fee_per_unit DECIMAL(10,2) DEFAULT 0;
