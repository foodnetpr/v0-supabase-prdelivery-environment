-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Restaurants table (tenants)
CREATE TABLE IF NOT EXISTS public.restaurants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL, -- URL identifier (e.g., 'joes-catering')
  name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#5d1f1f',
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  min_delivery_order DECIMAL(10,2) DEFAULT 0,
  tax_rate DECIMAL(5,4) DEFAULT 0,
  lead_time_hours INTEGER DEFAULT 24,
  is_active BOOLEAN DEFAULT true,
  standalone_domain TEXT, -- For Option 3: custom domain if exported
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Item types table
CREATE TABLE IF NOT EXISTS public.item_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Menu items table
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  item_type_id UUID REFERENCES public.item_types(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  serves INTEGER,
  dietary_tags TEXT[], -- Array of dietary tags (vegetarian, vegan, etc.)
  is_bundle BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Item options (for customizable items)
CREATE TABLE IF NOT EXISTS public.item_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- "Sandwich Selection", "Dressing", etc.
  is_required BOOLEAN DEFAULT false,
  min_selection INTEGER DEFAULT 0,
  max_selection INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Item option choices
CREATE TABLE IF NOT EXISTS public.item_option_choices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_option_id UUID NOT NULL REFERENCES public.item_options(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_modifier DECIMAL(10,2) DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bundle items (items that are part of a bundle)
CREATE TABLE IF NOT EXISTS public.bundle_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bundle_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Service packages table
CREATE TABLE IF NOT EXISTS public.service_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  base_price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Service package base inclusions
CREATE TABLE IF NOT EXISTS public.package_inclusions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_id UUID NOT NULL REFERENCES public.service_packages(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Service package add-ons
CREATE TABLE IF NOT EXISTS public.package_addons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_id UUID NOT NULL REFERENCES public.service_packages(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_per_unit DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL, -- "table", "dish", "set", etc.
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Package addon availability (which packages can use which add-ons)
CREATE TABLE IF NOT EXISTS public.package_addon_availability (
  package_id UUID NOT NULL REFERENCES public.service_packages(id) ON DELETE CASCADE,
  addon_id UUID NOT NULL REFERENCES public.package_addons(id) ON DELETE CASCADE,
  PRIMARY KEY (package_id, addon_id)
);

-- Orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  delivery_type TEXT NOT NULL, -- 'delivery' or 'pickup'
  delivery_date DATE NOT NULL,
  delivery_address TEXT,
  delivery_city TEXT,
  delivery_state TEXT,
  delivery_zip TEXT,
  special_instructions TEXT,
  subtotal DECIMAL(10,2) NOT NULL,
  tax DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  tip DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, confirmed, preparing, delivered, cancelled
  stripe_payment_intent_id TEXT,
  service_package_id UUID REFERENCES public.service_packages(id) ON DELETE SET NULL,
  service_package_total DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order items table
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  selected_options JSONB, -- Store selected options as JSON
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_option_choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_inclusions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_addon_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow public read access for active restaurants and their data
CREATE POLICY "Public can view active restaurants"
  ON public.restaurants FOR SELECT
  USING (is_active = true);

CREATE POLICY "Public can view categories"
  ON public.categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Public can view item types"
  ON public.item_types FOR SELECT
  USING (true);

CREATE POLICY "Public can view active menu items"
  ON public.menu_items FOR SELECT
  USING (is_active = true);

CREATE POLICY "Public can view item options"
  ON public.item_options FOR SELECT
  USING (true);

CREATE POLICY "Public can view option choices"
  ON public.item_option_choices FOR SELECT
  USING (true);

CREATE POLICY "Public can view bundle items"
  ON public.bundle_items FOR SELECT
  USING (true);

CREATE POLICY "Public can view active service packages"
  ON public.service_packages FOR SELECT
  USING (is_active = true);

CREATE POLICY "Public can view package inclusions"
  ON public.package_inclusions FOR SELECT
  USING (true);

CREATE POLICY "Public can view package add-ons"
  ON public.package_addons FOR SELECT
  USING (true);

CREATE POLICY "Public can view addon availability"
  ON public.package_addon_availability FOR SELECT
  USING (true);

CREATE POLICY "Public can insert orders"
  ON public.orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can view their orders"
  ON public.orders FOR SELECT
  USING (true);

CREATE POLICY "Public can insert order items"
  ON public.order_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can view order items"
  ON public.order_items FOR SELECT
  USING (true);

-- Create indexes for performance
CREATE INDEX idx_restaurants_slug ON public.restaurants(slug);
CREATE INDEX idx_categories_restaurant ON public.categories(restaurant_id);
CREATE INDEX idx_menu_items_restaurant ON public.menu_items(restaurant_id);
CREATE INDEX idx_menu_items_category ON public.menu_items(category_id);
CREATE INDEX idx_orders_restaurant ON public.orders(restaurant_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_date ON public.orders(delivery_date);
