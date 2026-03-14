-- Add Stripe Connect account support to branches
-- Each branch can have its own Stripe connected account

-- Add stripe_account_id to branches table
ALTER TABLE branches 
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT DEFAULT NULL;

-- Add stripe_account_id to orders table to track which account processed the payment
-- This is critical for refunds and payment modifications
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT DEFAULT NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_branches_stripe_account ON branches(stripe_account_id) WHERE stripe_account_id IS NOT NULL;

-- Comment explaining the field usage
COMMENT ON COLUMN branches.stripe_account_id IS 'Stripe Connect account ID (e.g., acct_XXXXX) for this branch. Payments are routed to this account.';
COMMENT ON COLUMN orders.stripe_account_id IS 'Stripe Connect account ID that processed the original payment. Used for refunds and payment modifications.';
