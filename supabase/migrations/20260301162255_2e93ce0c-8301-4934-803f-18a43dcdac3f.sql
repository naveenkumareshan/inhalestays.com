
-- Add is_approved column to cabins table
ALTER TABLE cabins ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT false;

-- Auto-approve all existing cabins
UPDATE cabins SET is_approved = true;

-- Update the public viewing policy to also check is_approved
DROP POLICY IF EXISTS "Anyone can view active cabins" ON cabins;
CREATE POLICY "Anyone can view active approved cabins"
  ON cabins FOR SELECT
  USING ((is_active = true AND is_approved = true));
