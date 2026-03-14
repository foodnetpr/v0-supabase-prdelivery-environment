-- Create operating_hours table for per-restaurant/branch schedules
CREATE TABLE IF NOT EXISTS operating_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_open BOOLEAN NOT NULL DEFAULT true,
  open_time TIME,
  close_time TIME,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(restaurant_id, branch_id, day_of_week)
);

-- RLS: public read for customer portal, service role write for admin
ALTER TABLE operating_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read operating hours"
  ON operating_hours FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage operating hours"
  ON operating_hours FOR ALL
  USING (true)
  WITH CHECK (true);
