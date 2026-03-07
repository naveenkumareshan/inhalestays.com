
-- Add WhatsApp columns to partners
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS whatsapp_number text;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean DEFAULT false;

-- Create site_settings table
CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read site_settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage site_settings" ON public.site_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- Create whatsapp_clicks tracking table
CREATE TABLE IF NOT EXISTS public.whatsapp_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_user_id uuid NOT NULL REFERENCES public.profiles(id),
  property_type text NOT NULL,
  property_id uuid NOT NULL,
  user_id uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.whatsapp_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can insert whatsapp_clicks" ON public.whatsapp_clicks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Partners and admins can read whatsapp_clicks" ON public.whatsapp_clicks FOR SELECT TO authenticated
  USING (
    partner_user_id = auth.uid()
    OR public.is_partner_or_employee_of(partner_user_id)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );
