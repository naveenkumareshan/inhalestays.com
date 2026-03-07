-- Add reconciliation columns to receipts (reading room)
ALTER TABLE public.receipts 
  ADD COLUMN IF NOT EXISTS reconciliation_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reconciled_at timestamptz,
  ADD COLUMN IF NOT EXISTS reconciled_by uuid,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Add reconciliation columns to hostel_receipts
ALTER TABLE public.hostel_receipts 
  ADD COLUMN IF NOT EXISTS reconciliation_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reconciled_at timestamptz,
  ADD COLUMN IF NOT EXISTS reconciled_by uuid,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Add reconciliation columns to mess_receipts
ALTER TABLE public.mess_receipts 
  ADD COLUMN IF NOT EXISTS reconciliation_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reconciled_at timestamptz,
  ADD COLUMN IF NOT EXISTS reconciled_by uuid,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Add reconciliation columns to laundry_receipts
ALTER TABLE public.laundry_receipts 
  ADD COLUMN IF NOT EXISTS reconciliation_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reconciled_at timestamptz,
  ADD COLUMN IF NOT EXISTS reconciled_by uuid,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_receipts_reconciliation ON public.receipts(reconciliation_status);
CREATE INDEX IF NOT EXISTS idx_hostel_receipts_reconciliation ON public.hostel_receipts(reconciliation_status);
CREATE INDEX IF NOT EXISTS idx_mess_receipts_reconciliation ON public.mess_receipts(reconciliation_status);
CREATE INDEX IF NOT EXISTS idx_laundry_receipts_reconciliation ON public.laundry_receipts(reconciliation_status);