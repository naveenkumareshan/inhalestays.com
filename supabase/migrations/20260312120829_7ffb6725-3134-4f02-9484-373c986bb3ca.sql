
ALTER TABLE public.hostels ADD COLUMN billing_type text NOT NULL DEFAULT 'day_model';
ALTER TABLE public.hostels ADD COLUMN payment_window_days integer NOT NULL DEFAULT 5;
