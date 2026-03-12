
ALTER TABLE public.cabins ADD COLUMN IF NOT EXISTS is_partner_visible boolean NOT NULL DEFAULT true;
ALTER TABLE public.hostels ADD COLUMN IF NOT EXISTS is_partner_visible boolean NOT NULL DEFAULT true;
ALTER TABLE public.mess_partners ADD COLUMN IF NOT EXISTS is_partner_visible boolean NOT NULL DEFAULT true;
