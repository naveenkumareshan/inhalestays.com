
ALTER TABLE public.mess_partners
  ADD COLUMN IF NOT EXISTS starting_price numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS average_rating numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_count integer DEFAULT 0;
