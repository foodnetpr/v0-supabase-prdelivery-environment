-- Container-based delivery fee system

-- 1. Create delivery_container_rates table
CREATE TABLE IF NOT EXISTS delivery_container_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  container_type TEXT NOT NULL,
  label TEXT NOT NULL,
  included_count INTEGER NOT NULL DEFAULT 0,
  extra_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(restaurant_id, container_type)
);

ALTER TABLE delivery_container_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view container rates"
  ON delivery_container_rates FOR SELECT USING (true);

CREATE POLICY "Service role can manage container rates"
  ON delivery_container_rates FOR ALL
  USING (true) WITH CHECK (true);

-- 2. Add container fields to menu_items
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS container_type TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS containers_per_unit INTEGER DEFAULT 1;

-- 3. Add delivery config to restaurants
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS delivery_base_fee DECIMAL(10,2) DEFAULT 28.00,
  ADD COLUMN IF NOT EXISTS delivery_fee_per_container BOOLEAN DEFAULT false;

-- 4. Add delivery config to branches (for override)
ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS delivery_base_fee DECIMAL(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS delivery_fee_per_container BOOLEAN DEFAULT NULL;
