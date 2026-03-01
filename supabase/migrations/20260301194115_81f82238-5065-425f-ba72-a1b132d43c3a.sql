
-- Table: subscription_plans
CREATE TABLE public.subscription_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  price_yearly numeric NOT NULL DEFAULT 0,
  price_monthly_display numeric NOT NULL DEFAULT 0,
  hostel_bed_limit integer NOT NULL DEFAULT 0,
  reading_room_seat_limit integer NOT NULL DEFAULT 0,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  capacity_upgrade_enabled boolean NOT NULL DEFAULT false,
  capacity_upgrade_price numeric NOT NULL DEFAULT 300,
  capacity_upgrade_slab_beds integer NOT NULL DEFAULT 50,
  capacity_upgrade_slab_seats integer NOT NULL DEFAULT 75,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  description text NOT NULL DEFAULT '',
  serial_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table: property_subscriptions
CREATE TABLE public.property_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id uuid NOT NULL REFERENCES public.partners(id),
  property_type text NOT NULL DEFAULT 'reading_room',
  property_id uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  status text NOT NULL DEFAULT 'pending_payment',
  start_date date,
  end_date date,
  amount_paid numeric NOT NULL DEFAULT 0,
  capacity_upgrades integer NOT NULL DEFAULT 0,
  capacity_upgrade_amount numeric NOT NULL DEFAULT 0,
  razorpay_order_id text NOT NULL DEFAULT '',
  razorpay_payment_id text NOT NULL DEFAULT '',
  payment_status text NOT NULL DEFAULT 'pending',
  serial_number text,
  previous_plan_id uuid REFERENCES public.subscription_plans(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS: subscription_plans
CREATE POLICY "Admins can manage all subscription plans"
  ON public.subscription_plans FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active subscription plans"
  ON public.subscription_plans FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Public can view active subscription plans"
  ON public.subscription_plans FOR SELECT
  TO anon
  USING (is_active = true);

-- RLS: property_subscriptions
CREATE POLICY "Admins can manage all property subscriptions"
  ON public.property_subscriptions FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Partners can view own subscriptions"
  ON public.property_subscriptions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM partners p WHERE p.id = property_subscriptions.partner_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Partners can insert own subscriptions"
  ON public.property_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM partners p WHERE p.id = property_subscriptions.partner_id AND p.user_id = auth.uid()
  ));

-- Serial number triggers
CREATE OR REPLACE FUNCTION public.set_serial_subscription_plans()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.serial_number IS NULL THEN
    NEW.serial_number := generate_serial_number('SPLAN');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_serial_subscription_plans
  BEFORE INSERT ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_serial_subscription_plans();

CREATE OR REPLACE FUNCTION public.set_serial_property_subscriptions()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.serial_number IS NULL THEN
    NEW.serial_number := generate_serial_number('SSUB');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_serial_property_subscriptions
  BEFORE INSERT ON public.property_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_serial_property_subscriptions();

-- Updated_at triggers
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_property_subscriptions_updated_at
  BEFORE UPDATE ON public.property_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default plans
INSERT INTO public.subscription_plans (name, slug, price_yearly, price_monthly_display, hostel_bed_limit, reading_room_seat_limit, features, capacity_upgrade_enabled, display_order, description) VALUES
('Silver', 'silver', 9600, 800, 30, 50,
 '["booking_management", "student_list", "basic_dues", "standard_support"]'::jsonb,
 true, 1, 'Best for small operators'),
('Gold', 'gold', 14400, 1200, 50, 120,
 '["booking_management", "student_list", "basic_dues", "standard_support", "basic_analytics", "downloadable_reports", "sponsored_eligible"]'::jsonb,
 true, 2, 'Best for growing operators'),
('Platinum', 'platinum', 21600, 1800, 120, 180,
 '["booking_management", "student_list", "basic_dues", "standard_support", "basic_analytics", "downloadable_reports", "sponsored_eligible", "advanced_analytics", "monthly_comparison", "dues_aging_report", "refund_tracking", "sponsored_priority", "priority_support"]'::jsonb,
 true, 3, 'Best for professional operators'),
('Diamond', 'diamond', 42000, 3500, 0, 0,
 '["booking_management", "student_list", "basic_dues", "standard_support", "basic_analytics", "downloadable_reports", "sponsored_eligible", "advanced_analytics", "monthly_comparison", "dues_aging_report", "refund_tracking", "sponsored_priority", "priority_support", "api_access", "white_label", "top_sponsored", "dedicated_support", "early_access", "custom_reports", "settlement_tracking"]'::jsonb,
 false, 4, 'For large operators & chains');
