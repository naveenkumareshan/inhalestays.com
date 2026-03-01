
-- Add settlement tracking columns to receipts (Reading Room)
ALTER TABLE public.receipts 
  ADD COLUMN IF NOT EXISTS settlement_status text NOT NULL DEFAULT 'unsettled',
  ADD COLUMN IF NOT EXISTS settlement_id uuid REFERENCES public.partner_settlements(id);

-- Add settlement tracking columns to hostel_receipts
ALTER TABLE public.hostel_receipts 
  ADD COLUMN IF NOT EXISTS settlement_status text NOT NULL DEFAULT 'unsettled',
  ADD COLUMN IF NOT EXISTS settlement_id uuid REFERENCES public.partner_settlements(id);

-- Add receipt reference columns to settlement_items
ALTER TABLE public.settlement_items
  ADD COLUMN IF NOT EXISTS receipt_id uuid REFERENCES public.receipts(id),
  ADD COLUMN IF NOT EXISTS hostel_receipt_id uuid REFERENCES public.hostel_receipts(id),
  ADD COLUMN IF NOT EXISTS receipt_serial text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS receipt_type text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_date timestamptz;

-- Index for fast queries on unsettled online receipts
CREATE INDEX IF NOT EXISTS idx_receipts_settlement_status ON public.receipts(settlement_status) WHERE payment_method = 'online';
CREATE INDEX IF NOT EXISTS idx_hostel_receipts_settlement_status ON public.hostel_receipts(settlement_status) WHERE payment_method = 'online';
