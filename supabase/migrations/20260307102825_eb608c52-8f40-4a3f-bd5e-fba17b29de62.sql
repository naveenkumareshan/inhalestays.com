ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS bank_narration text;
ALTER TABLE public.hostel_receipts ADD COLUMN IF NOT EXISTS bank_narration text;
ALTER TABLE public.mess_receipts ADD COLUMN IF NOT EXISTS bank_narration text;
ALTER TABLE public.laundry_receipts ADD COLUMN IF NOT EXISTS bank_narration text;