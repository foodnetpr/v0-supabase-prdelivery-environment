CREATE TABLE IF NOT EXISTS partner_inquiries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  restaurant_name TEXT,
  address TEXT,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  status TEXT DEFAULT 'new'
);
