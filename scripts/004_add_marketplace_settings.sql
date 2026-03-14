-- Create marketplace settings table for global configuration
CREATE TABLE IF NOT EXISTS public.marketplace_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hero_image_url TEXT,
  hero_title TEXT DEFAULT 'Mercado de Catering',
  hero_subtitle TEXT DEFAULT 'La plataforma para catering local',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.marketplace_settings ENABLE ROW LEVEL SECURITY;

-- Public can view marketplace settings
CREATE POLICY "Public can view marketplace settings"
ON public.marketplace_settings FOR SELECT
USING (true);

-- Insert default settings
INSERT INTO public.marketplace_settings (hero_title, hero_subtitle)
VALUES ('Mercado de Catering', 'La plataforma para catering local')
ON CONFLICT DO NOTHING;
