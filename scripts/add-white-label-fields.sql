-- Add white-label fields to restaurants table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS white_label BOOLEAN DEFAULT false;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS show_powered_by BOOLEAN DEFAULT true;
