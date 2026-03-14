-- Add original_branch_id to orders table to track where the order was originally placed
-- This allows order editing to be restricted to the original branch

-- Add the column
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS original_branch_id UUID REFERENCES public.branches(id);

-- Set original_branch_id to current branch_id for existing orders
UPDATE public.orders 
SET original_branch_id = branch_id 
WHERE original_branch_id IS NULL AND branch_id IS NOT NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_orders_original_branch ON public.orders(original_branch_id);

-- Create index on branch_id for filtered queries
CREATE INDEX IF NOT EXISTS idx_orders_branch ON public.orders(branch_id);
