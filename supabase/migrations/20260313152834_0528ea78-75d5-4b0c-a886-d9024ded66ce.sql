
CREATE TABLE public.partner_nav_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nav_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_nav_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own nav preferences"
  ON public.partner_nav_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own nav preferences"
  ON public.partner_nav_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own nav preferences"
  ON public.partner_nav_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_partner_nav_preferences_updated_at
  BEFORE UPDATE ON public.partner_nav_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
