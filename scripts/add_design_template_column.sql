-- Add design_template column to restaurants table
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS design_template VARCHAR(50) DEFAULT 'classic';

-- Add restaurant_discount_percent column if missing
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS restaurant_discount_percent NUMERIC DEFAULT 0;

-- Add delivery_lead_time_hours column if missing  
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS delivery_lead_time_hours INTEGER;

-- Add pickup_lead_time_hours column if missing
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS pickup_lead_time_hours INTEGER;

-- Add max_advance_days column if missing
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS max_advance_days INTEGER DEFAULT 30;

-- Add tip options columns if missing
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS tip_option_1 NUMERIC DEFAULT 15;

ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS tip_option_2 NUMERIC DEFAULT 18;

ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS tip_option_3 NUMERIC DEFAULT 20;

-- Add delivery_base_fee column if missing
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS delivery_base_fee NUMERIC;

-- Add delivery_included_containers column if missing
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS delivery_included_containers INTEGER;

-- Add footer_description column if missing
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS footer_description TEXT;

-- Add footer_links column if missing
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS footer_links JSONB;

-- Add payment_provider column if missing
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(50) DEFAULT 'stripe';

-- Add square_environment column if missing
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS square_environment VARCHAR(20) DEFAULT 'sandbox';

-- Add athmovil_ecommerce_id column if missing
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS athmovil_ecommerce_id TEXT;

-- Add is_chain column if missing
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS is_chain BOOLEAN DEFAULT false;

-- Add hide_branch_selector_title column if missing
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS hide_branch_selector_title BOOLEAN DEFAULT false;

-- Add white_label column if missing (different from white_label_enabled)
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS white_label BOOLEAN DEFAULT false;
