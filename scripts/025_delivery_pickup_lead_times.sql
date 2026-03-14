-- Add separate delivery/pickup lead times and max advance booking days
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS delivery_lead_time_hours integer;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS pickup_lead_time_hours integer;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS max_advance_days integer;
