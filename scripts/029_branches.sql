-- Add is_chain flag to restaurants
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS is_chain boolean DEFAULT false;

-- Create branches table
CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  address text,
  city text,
  state text,
  zip text,
  phone text,
  image_url text,
  delivery_fee numeric(10,2),
  delivery_lead_time_hours integer,
  pickup_lead_time_hours integer,
  max_advance_days integer,
  shipday_api_key text,
  delivery_enabled boolean DEFAULT true,
  pickup_enabled boolean DEFAULT true,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(restaurant_id, slug)
);

-- Create branch menu overrides table
CREATE TABLE IF NOT EXISTS branch_menu_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  price_override numeric(10,2),
  is_hidden boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(branch_id, menu_item_id)
);

-- Add branch_id to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches(id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_branches_restaurant ON branches(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_branches_active ON branches(restaurant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_branch_overrides_branch ON branch_menu_overrides(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_overrides_item ON branch_menu_overrides(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_orders_branch ON orders(branch_id);
