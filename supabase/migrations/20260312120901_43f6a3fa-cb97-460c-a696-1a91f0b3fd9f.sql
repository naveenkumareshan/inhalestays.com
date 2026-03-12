
ALTER TABLE public.hostel_dues ADD COLUMN billing_month date;
ALTER TABLE public.hostel_dues ADD COLUMN is_prorated boolean NOT NULL DEFAULT false;
ALTER TABLE public.hostel_dues ADD COLUMN auto_generated boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX idx_hostel_dues_booking_month ON public.hostel_dues (booking_id, billing_month) WHERE billing_month IS NOT NULL;
