
-- Create coupons table
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text DEFAULT '',
  type text NOT NULL,
  value numeric NOT NULL,
  max_discount_amount numeric DEFAULT 0,
  min_order_amount numeric DEFAULT 0,
  applicable_for text[] DEFAULT '{all}',
  scope text DEFAULT 'global',
  partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  is_referral_coupon boolean DEFAULT false,
  referral_type text,
  generated_by uuid,
  usage_limit integer,
  usage_count integer DEFAULT 0,
  user_usage_limit integer DEFAULT 1,
  used_by jsonb DEFAULT '[]',
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  first_time_user_only boolean DEFAULT false,
  specific_users uuid[] DEFAULT '{}',
  exclude_users uuid[] DEFAULT '{}',
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Admin full CRUD
CREATE POLICY "Admins can manage all coupons"
ON public.coupons FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Partners can view their own vendor coupons + global coupons
CREATE POLICY "Partners can view relevant coupons"
ON public.coupons FOR SELECT
TO authenticated
USING (
  (has_role(auth.uid(), 'vendor'::app_role) OR has_role(auth.uid(), 'vendor_employee'::app_role))
  AND (
    scope = 'global'
    OR (scope = 'vendor' AND partner_id IN (
      SELECT p.id FROM partners p WHERE p.user_id = auth.uid()
    ))
  )
);

-- Authenticated users can view active coupons (for validation/available)
CREATE POLICY "Users can view active coupons"
ON public.coupons FOR SELECT
TO authenticated
USING (is_active = true AND now() BETWEEN start_date AND end_date);

-- Indexes
CREATE INDEX idx_coupons_is_active ON public.coupons(is_active);
CREATE INDEX idx_coupons_scope ON public.coupons(scope);
CREATE INDEX idx_coupons_dates ON public.coupons(start_date, end_date);
CREATE INDEX idx_coupons_partner_id ON public.coupons(partner_id);

-- Updated_at trigger
CREATE TRIGGER update_coupons_updated_at
BEFORE UPDATE ON public.coupons
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
