
-- ============================================
-- LAUNDRY MODULE: Complete Schema
-- ============================================

-- 1. laundry_partners
CREATE TABLE public.laundry_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_name text NOT NULL DEFAULT '',
  contact_person text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  service_area text NOT NULL DEFAULT '',
  bank_details jsonb DEFAULT '{}'::jsonb,
  commission_percentage numeric NOT NULL DEFAULT 10,
  is_active boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'pending',
  serial_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.laundry_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all laundry partners" ON public.laundry_partners FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Partners can view own record" ON public.laundry_partners FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Partners can update own record" ON public.laundry_partners FOR UPDATE USING (auth.uid() = user_id);

-- Serial trigger for laundry partners
CREATE OR REPLACE FUNCTION public.set_serial_laundry_partners()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.serial_number IS NULL THEN
    NEW.serial_number := generate_serial_number('LPRTN');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_serial_laundry_partners BEFORE INSERT ON public.laundry_partners FOR EACH ROW EXECUTE FUNCTION public.set_serial_laundry_partners();
CREATE TRIGGER trg_updated_laundry_partners BEFORE UPDATE ON public.laundry_partners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. laundry_items
CREATE TABLE public.laundry_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text NOT NULL DEFAULT '👕',
  price numeric NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'clothing',
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.laundry_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage laundry items" ON public.laundry_items FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view active laundry items" ON public.laundry_items FOR SELECT USING (is_active = true);

-- 3. laundry_pickup_slots
CREATE TABLE public.laundry_pickup_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_name text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  max_orders integer NOT NULL DEFAULT 10,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.laundry_pickup_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage laundry pickup slots" ON public.laundry_pickup_slots FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view active pickup slots" ON public.laundry_pickup_slots FOR SELECT USING (is_active = true);

-- 4. laundry_orders
CREATE TABLE public.laundry_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number text,
  user_id uuid NOT NULL,
  partner_id uuid REFERENCES public.laundry_partners(id),
  status text NOT NULL DEFAULT 'pending',
  pickup_otp text NOT NULL DEFAULT lpad(floor(random() * 10000)::text, 4, '0'),
  pickup_otp_verified boolean NOT NULL DEFAULT false,
  delivery_otp text NOT NULL DEFAULT lpad(floor(random() * 10000)::text, 4, '0'),
  delivery_otp_verified boolean NOT NULL DEFAULT false,
  pickup_address jsonb DEFAULT '{}'::jsonb,
  pickup_date date,
  pickup_time_slot text DEFAULT '',
  delivery_date date,
  delivery_time_slot text DEFAULT '',
  total_amount numeric NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'pending',
  payment_method text NOT NULL DEFAULT 'online',
  razorpay_order_id text DEFAULT '',
  razorpay_payment_id text DEFAULT '',
  razorpay_signature text DEFAULT '',
  settlement_status text NOT NULL DEFAULT 'unsettled',
  settlement_id uuid,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.laundry_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all laundry orders" ON public.laundry_orders FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Students can insert own laundry orders" ON public.laundry_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Students can view own laundry orders" ON public.laundry_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Students can update own laundry orders" ON public.laundry_orders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Laundry partners can view assigned orders" ON public.laundry_orders FOR SELECT USING (EXISTS (SELECT 1 FROM public.laundry_partners lp WHERE lp.id = laundry_orders.partner_id AND lp.user_id = auth.uid()));
CREATE POLICY "Laundry partners can update assigned orders" ON public.laundry_orders FOR UPDATE USING (EXISTS (SELECT 1 FROM public.laundry_partners lp WHERE lp.id = laundry_orders.partner_id AND lp.user_id = auth.uid()));

-- Serial trigger
CREATE OR REPLACE FUNCTION public.set_serial_laundry_orders()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.serial_number IS NULL THEN
    NEW.serial_number := generate_serial_number('LNDRY');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_serial_laundry_orders BEFORE INSERT ON public.laundry_orders FOR EACH ROW EXECUTE FUNCTION public.set_serial_laundry_orders();
CREATE TRIGGER trg_updated_laundry_orders BEFORE UPDATE ON public.laundry_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. laundry_order_items
CREATE TABLE public.laundry_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.laundry_orders(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.laundry_items(id),
  item_name text NOT NULL,
  item_price numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  subtotal numeric NOT NULL DEFAULT 0
);

ALTER TABLE public.laundry_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all laundry order items" ON public.laundry_order_items FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Students can view own order items" ON public.laundry_order_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.laundry_orders lo WHERE lo.id = laundry_order_items.order_id AND lo.user_id = auth.uid()));
CREATE POLICY "Students can insert own order items" ON public.laundry_order_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.laundry_orders lo WHERE lo.id = laundry_order_items.order_id AND lo.user_id = auth.uid()));
CREATE POLICY "Partners can view assigned order items" ON public.laundry_order_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.laundry_orders lo JOIN public.laundry_partners lp ON lp.id = lo.partner_id WHERE lo.id = laundry_order_items.order_id AND lp.user_id = auth.uid()));

-- 6. laundry_receipts
CREATE TABLE public.laundry_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number text,
  order_id uuid REFERENCES public.laundry_orders(id),
  user_id uuid NOT NULL,
  partner_id uuid REFERENCES public.laundry_partners(id),
  amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'online',
  transaction_id text DEFAULT '',
  receipt_type text NOT NULL DEFAULT 'laundry_payment',
  settlement_status text NOT NULL DEFAULT 'unsettled',
  settlement_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.laundry_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all laundry receipts" ON public.laundry_receipts FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Students can view own laundry receipts" ON public.laundry_receipts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Students can insert own laundry receipts" ON public.laundry_receipts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Partners can view own laundry receipts" ON public.laundry_receipts FOR SELECT USING (EXISTS (SELECT 1 FROM public.laundry_partners lp WHERE lp.id = laundry_receipts.partner_id AND lp.user_id = auth.uid()));

-- Serial trigger
CREATE OR REPLACE FUNCTION public.set_serial_laundry_receipts()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.serial_number IS NULL THEN
    NEW.serial_number := generate_serial_number('LRCPT');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_serial_laundry_receipts BEFORE INSERT ON public.laundry_receipts FOR EACH ROW EXECUTE FUNCTION public.set_serial_laundry_receipts();

-- 7. laundry_complaints
CREATE TABLE public.laundry_complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number text,
  order_id uuid REFERENCES public.laundry_orders(id),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  response text DEFAULT '',
  responded_by uuid,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.laundry_complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all laundry complaints" ON public.laundry_complaints FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Students can insert own laundry complaints" ON public.laundry_complaints FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Students can view own laundry complaints" ON public.laundry_complaints FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Partners can view complaints for assigned orders" ON public.laundry_complaints FOR SELECT USING (EXISTS (SELECT 1 FROM public.laundry_orders lo JOIN public.laundry_partners lp ON lp.id = lo.partner_id WHERE lo.id = laundry_complaints.order_id AND lp.user_id = auth.uid()));

-- Serial trigger
CREATE OR REPLACE FUNCTION public.set_serial_laundry_complaints()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.serial_number IS NULL THEN
    NEW.serial_number := generate_serial_number('LCMPL');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_serial_laundry_complaints BEFORE INSERT ON public.laundry_complaints FOR EACH ROW EXECUTE FUNCTION public.set_serial_laundry_complaints();
CREATE TRIGGER trg_updated_laundry_complaints BEFORE UPDATE ON public.laundry_complaints FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
