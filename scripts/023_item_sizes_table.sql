-- Create item_sizes table for size variants (e.g., Medium serves 10 $150, Large serves 20 $290)
CREATE TABLE IF NOT EXISTS item_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  serves INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by menu item
CREATE INDEX IF NOT EXISTS idx_item_sizes_menu_item_id ON item_sizes(menu_item_id);

-- RLS: public read access
ALTER TABLE item_sizes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read item sizes" ON item_sizes;
CREATE POLICY "Public can read item sizes" ON item_sizes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role can manage item sizes" ON item_sizes;
CREATE POLICY "Service role can manage item sizes" ON item_sizes FOR ALL USING (true) WITH CHECK (true);
