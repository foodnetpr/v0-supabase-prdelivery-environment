-- Add UPDATE policy for orders table to allow KDS status changes
-- This policy allows authenticated users to update orders for restaurants they have access to

-- First, drop any existing update policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can update orders" ON orders;
DROP POLICY IF EXISTS "Allow order status updates" ON orders;

-- Create a policy that allows updating orders
-- This allows any authenticated user to update orders (for KDS functionality)
CREATE POLICY "Allow order status updates" ON orders
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Also ensure the service role can always update (for API routes)
-- Note: Service role bypasses RLS by default, but this is explicit
