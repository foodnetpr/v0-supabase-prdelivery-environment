-- Create promo_cards table for the "Ofertas y Promociones" carousel
CREATE TABLE IF NOT EXISTS promo_cards (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text        NOT NULL,
  subtitle    text,
  badge       text,
  badge_color text        NOT NULL DEFAULT 'bg-slate-500',
  image_url   text,
  href        text        NOT NULL DEFAULT '#',
  display_order integer   NOT NULL DEFAULT 0,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Seed with the current hardcoded promo cards (migrating existing data)
INSERT INTO promo_cards (title, subtitle, badge, badge_color, image_url, href, display_order, is_active)
VALUES
  ('Bebidas & Extras',         'Agrega a tu orden',     'Nuevo',         'bg-blue-500',    '/images/slide-shop.jpg',      '/shop', 1, true),
  ('Menú Corporativo',         'Desde $15/persona',     'Nuevo',         'bg-emerald-500', '/images/slide-catering-2.jpg','#',     2, true),
  ('Fiestas y Celebraciones',  'Paquetes especiales',   'Popular',       'bg-amber-500',   '/images/slide-catering-3.jpg','#',     3, true),
  ('Platos Principales',       'Solo esta semana',      '2x1',           'bg-red-500',     '/images/slide-catering-1.jpg','#',     4, true),
  ('Delivery Gratis',          'En ordenes +$50',       'Gratis',        'bg-blue-500',    '/images/slide-catering-2.jpg','#',     5, true)
ON CONFLICT DO NOTHING;

-- Allow public reads (carousel is public-facing)
ALTER TABLE promo_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active promo cards"
  ON promo_cards FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated users can manage promo cards"
  ON promo_cards FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
