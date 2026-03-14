-- Create cuisine_types table for manageable cuisine categories
CREATE TABLE IF NOT EXISTS public.cuisine_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed with default Spanish cuisine types
INSERT INTO public.cuisine_types (name, display_order) VALUES
  ('Mexicana', 1),
  ('Italiana', 2),
  ('Americana', 3),
  ('Asiática', 4),
  ('Japonesa', 5),
  ('China', 6),
  ('Tailandesa', 7),
  ('Coreana', 8),
  ('Vietnamita', 9),
  ('India', 10),
  ('Mediterránea', 11),
  ('Francesa', 12),
  ('BBQ', 13),
  ('Mariscos', 14),
  ('Vegetariana', 15),
  ('Vegana', 16),
  ('Fusión', 17),
  ('Caribeña', 18),
  ('Peruana', 19),
  ('Colombiana', 20),
  ('Salvadoreña', 21),
  ('Cubana', 22),
  ('Otra', 99)
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE public.cuisine_types ENABLE ROW LEVEL SECURITY;

-- Everyone can read cuisine types
CREATE POLICY "Anyone can read cuisine types" ON public.cuisine_types
  FOR SELECT USING (true);
