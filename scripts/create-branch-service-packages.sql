-- Create branch_service_packages join table for assigning specific packages to branches
CREATE TABLE IF NOT EXISTS branch_service_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES service_packages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(branch_id, package_id)
);

-- Enable RLS
ALTER TABLE branch_service_packages ENABLE ROW LEVEL SECURITY;

-- Allow public read for customer portal
CREATE POLICY "Allow public read branch_service_packages"
  ON branch_service_packages FOR SELECT
  TO public
  USING (true);

-- Allow service role full access for admin operations
CREATE POLICY "Allow service role all on branch_service_packages"
  ON branch_service_packages FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
