
ALTER TABLE public.mess_partners 
ADD COLUMN IF NOT EXISTS images jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS logo_image text,
ADD COLUMN IF NOT EXISTS is_booking_active boolean NOT NULL DEFAULT true;
