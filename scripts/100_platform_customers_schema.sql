-- =====================================================
-- PLATFORM-WIDE CUSTOMER SCHEMA
-- Enables DoorDash/UberEats-style unified customer accounts
-- =====================================================

-- 1. CUSTOMERS TABLE (platform-wide accounts linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  first_name TEXT,
  last_name TEXT,
  profile_image_url TEXT,
  default_address_id UUID,  -- FK added after customer_addresses created
  default_payment_method_id UUID,  -- FK added after customer_payment_methods created
  email_notifications BOOLEAN DEFAULT TRUE,
  sms_notifications BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CUSTOMER ADDRESSES (multiple per customer, usable for any restaurant)
CREATE TABLE IF NOT EXISTS customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label TEXT DEFAULT 'Home',  -- "Home", "Work", "Mom's House"
  address_line_1 TEXT NOT NULL,
  address_line_2 TEXT,
  city TEXT NOT NULL,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'PR',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  delivery_instructions TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CUSTOMER PAYMENT METHODS (tokenized, platform-wide)
CREATE TABLE IF NOT EXISTS customer_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'square', 'athmovil')),
  provider_customer_id TEXT,  -- Stripe cus_xxx, Square customer ID
  provider_payment_method_id TEXT NOT NULL,  -- Stripe pm_xxx, etc.
  card_brand TEXT,  -- 'visa', 'mastercard', 'amex', etc.
  card_last_four TEXT,
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  billing_name TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CUSTOMER FAVORITES (save favorite restaurants)
CREATE TABLE IF NOT EXISTS customer_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, restaurant_id)
);

-- 5. Add foreign keys for default address and payment method
ALTER TABLE customers 
  ADD CONSTRAINT fk_default_address 
  FOREIGN KEY (default_address_id) 
  REFERENCES customer_addresses(id) ON DELETE SET NULL;

ALTER TABLE customers 
  ADD CONSTRAINT fk_default_payment_method 
  FOREIGN KEY (default_payment_method_id) 
  REFERENCES customer_payment_methods(id) ON DELETE SET NULL;

-- 6. Add customer_id to orders table
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id),
  ADD COLUMN IF NOT EXISTS customer_address_id UUID REFERENCES customer_addresses(id),
  ADD COLUMN IF NOT EXISTS customer_payment_method_id UUID REFERENCES customer_payment_methods(id);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_favorites ENABLE ROW LEVEL SECURITY;

-- CUSTOMERS policies
CREATE POLICY "Customers can view own profile" ON customers
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Customers can update own profile" ON customers
  FOR UPDATE USING (auth.uid() = auth_user_id);

CREATE POLICY "Customers can insert own profile" ON customers
  FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

-- CUSTOMER_ADDRESSES policies
CREATE POLICY "Customers can view own addresses" ON customer_addresses
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Customers can insert own addresses" ON customer_addresses
  FOR INSERT WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Customers can update own addresses" ON customer_addresses
  FOR UPDATE USING (
    customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Customers can delete own addresses" ON customer_addresses
  FOR DELETE USING (
    customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid())
  );

-- CUSTOMER_PAYMENT_METHODS policies
CREATE POLICY "Customers can view own payment methods" ON customer_payment_methods
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Customers can insert own payment methods" ON customer_payment_methods
  FOR INSERT WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Customers can update own payment methods" ON customer_payment_methods
  FOR UPDATE USING (
    customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Customers can delete own payment methods" ON customer_payment_methods
  FOR DELETE USING (
    customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid())
  );

-- CUSTOMER_FAVORITES policies
CREATE POLICY "Customers can view own favorites" ON customer_favorites
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Customers can insert own favorites" ON customer_favorites
  FOR INSERT WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Customers can delete own favorites" ON customer_favorites
  FOR DELETE USING (
    customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid())
  );

-- ORDERS policy update: customers can view their own orders across all restaurants
CREATE POLICY "Customers can view own orders" ON orders
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid())
  );

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_customers_auth_user_id ON customers(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON customer_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_payment_methods_customer_id ON customer_payment_methods(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_favorites_customer_id ON customer_favorites(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);

-- =====================================================
-- TRIGGER: Auto-create customer profile on signup
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_customer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.customers (auth_user_id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', NULL),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', NULL)
  )
  ON CONFLICT (auth_user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Only create trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created_customer ON auth.users;

CREATE TRIGGER on_auth_user_created_customer
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_customer();
