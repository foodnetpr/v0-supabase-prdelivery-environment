-- Create cuisine_types table for managing food categories in the marketplace
CREATE TABLE IF NOT EXISTS cuisine_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create an index for faster sorting
CREATE INDEX IF NOT EXISTS idx_cuisine_types_display_order ON cuisine_types(display_order);

-- Enable RLS
ALTER TABLE cuisine_types ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Public can view cuisine types" ON cuisine_types
  FOR SELECT USING (true);

-- Allow authenticated users to manage cuisine types (super admins)
CREATE POLICY "Authenticated users can manage cuisine types" ON cuisine_types
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insert some default cuisine types
INSERT INTO cuisine_types (name, display_order) VALUES
  ('Puertorriqueña', 1),
  ('Mexicana', 2),
  ('Italiana', 3),
  ('Americana', 4),
  ('China', 5),
  ('Japonesa', 6),
  ('Española', 7),
  ('Argentina', 8),
  ('Peruana', 9),
  ('Colombiana', 10),
  ('Dominicana', 11),
  ('India', 12),
  ('Coreana', 13),
  ('BBQ', 14),
  ('Pizza', 15),
  ('Hamburguesas', 16),
  ('Sandwiches', 17),
  ('Pollo', 18),
  ('Alitas', 19),
  ('Mariscos', 20),
  ('Vegano', 21),
  ('Coffee', 22),
  ('Postres', 23)
ON CONFLICT (name) DO NOTHING;
