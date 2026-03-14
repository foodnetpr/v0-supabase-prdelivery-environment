CREATE TABLE IF NOT EXISTS marketplace_areas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE marketplace_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read marketplace_areas" ON marketplace_areas FOR SELECT USING (true);
CREATE POLICY "Service role can manage marketplace_areas" ON marketplace_areas FOR ALL USING (true);

-- Seed with existing hardcoded areas
INSERT INTO marketplace_areas (name, display_order) VALUES
  ('Hato Rey', 1),
  ('Condado', 2),
  ('Miramar', 3),
  ('Isla Verde', 4),
  ('Puerto Nuevo', 5),
  ('Rio Piedras', 6),
  ('Santurce', 7),
  ('Guaynabo Pueblo', 8),
  ('San Patricio', 9),
  ('Señorial', 10);
