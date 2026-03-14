
CREATE TABLE public.property_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id text NOT NULL,
  property_type text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_property_views_property ON property_views(property_id);
ALTER TABLE property_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert views"
  ON property_views FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read views"
  ON property_views FOR SELECT TO authenticated
  USING (true);
