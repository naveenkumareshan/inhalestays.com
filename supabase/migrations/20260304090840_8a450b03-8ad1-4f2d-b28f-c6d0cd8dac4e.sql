
-- Create partner_payment_modes table
CREATE TABLE public.partner_payment_modes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_user_id uuid NOT NULL,
  label text NOT NULL,
  mode_type text NOT NULL DEFAULT 'bank_transfer',
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.partner_payment_modes ENABLE ROW LEVEL SECURITY;

-- Partners can manage their own payment modes
CREATE POLICY "Partners can manage own payment modes"
ON public.partner_payment_modes
FOR ALL
USING (auth.uid() = partner_user_id)
WITH CHECK (auth.uid() = partner_user_id);

-- Admins can manage all payment modes
CREATE POLICY "Admins can manage all payment modes"
ON public.partner_payment_modes
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Index for fast lookup by partner
CREATE INDEX idx_partner_payment_modes_user ON public.partner_payment_modes(partner_user_id);
