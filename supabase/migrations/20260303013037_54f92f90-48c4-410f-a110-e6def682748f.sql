
-- Function 1: Get conflicting seat bookings (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_conflicting_seat_bookings(
  p_cabin_id uuid,
  p_start_date date,
  p_end_date date,
  p_slot_id uuid DEFAULT NULL
)
RETURNS TABLE(seat_id uuid, slot_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT b.seat_id, b.slot_id
  FROM public.bookings b
  WHERE b.cabin_id = p_cabin_id
    AND b.payment_status NOT IN ('cancelled', 'failed')
    AND b.start_date <= p_end_date
    AND b.end_date >= p_start_date;
$$;

-- Function 2: Get conflicting hostel bookings (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_conflicting_hostel_bookings(
  p_hostel_id uuid,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE(bed_id uuid, payment_status text, user_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT hb.bed_id, hb.payment_status::text, p.name as user_name
  FROM public.hostel_bookings hb
  LEFT JOIN public.profiles p ON p.id = hb.user_id
  WHERE hb.hostel_id = p_hostel_id
    AND hb.status IN ('confirmed', 'pending')
    AND (p_start_date IS NULL OR hb.start_date <= p_end_date)
    AND (p_end_date IS NULL OR hb.end_date >= p_start_date);
$$;

-- Function 3: Check single seat availability (bypasses RLS)
CREATE OR REPLACE FUNCTION public.check_seat_available(
  p_seat_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.bookings
    WHERE seat_id = p_seat_id
      AND payment_status NOT IN ('cancelled', 'failed')
      AND start_date <= p_end_date
      AND end_date >= p_start_date
  );
$$;

-- Function 4: Check single hostel bed availability (bypasses RLS)
CREATE OR REPLACE FUNCTION public.check_hostel_bed_available(
  p_bed_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.hostel_bookings
    WHERE bed_id = p_bed_id
      AND status IN ('confirmed', 'pending')
      AND start_date <= p_end_date
      AND end_date >= p_start_date
  );
$$;
