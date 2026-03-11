
-- Add property_owner_id column
ALTER TABLE public.booking_activity_log ADD COLUMN property_owner_id uuid;
CREATE INDEX idx_booking_activity_log_owner ON public.booking_activity_log(property_owner_id);

-- Backfill cabin bookings
UPDATE public.booking_activity_log bal
SET property_owner_id = c.created_by
FROM public.bookings b
JOIN public.cabins c ON c.id = b.cabin_id
WHERE bal.booking_id = b.id AND bal.booking_type = 'cabin' AND bal.property_owner_id IS NULL;

-- Backfill hostel bookings
UPDATE public.booking_activity_log bal
SET property_owner_id = h.created_by
FROM public.hostel_bookings hb
JOIN public.hostels h ON h.id = hb.hostel_id
WHERE bal.booking_id = hb.id AND bal.booking_type = 'hostel' AND bal.property_owner_id IS NULL;

-- Drop old permissive policies
DROP POLICY IF EXISTS "Authenticated users can view activity logs" ON public.booking_activity_log;
DROP POLICY IF EXISTS "Authenticated users can insert activity logs" ON public.booking_activity_log;

-- Admins can view all
CREATE POLICY "Admins can view all activity logs"
ON public.booking_activity_log FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
);

-- Partners/employees can view their own property logs
CREATE POLICY "Partners can view own property activity logs"
ON public.booking_activity_log FOR SELECT TO authenticated
USING (
  public.is_partner_or_employee_of(property_owner_id)
);

-- Authenticated users can insert
CREATE POLICY "Authenticated users can insert activity logs"
ON public.booking_activity_log FOR INSERT TO authenticated
WITH CHECK (true);
