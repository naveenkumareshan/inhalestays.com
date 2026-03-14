
-- 1. Update validate_property_attendance_type to allow 'mess'
CREATE OR REPLACE FUNCTION public.validate_property_attendance_type()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.property_type NOT IN ('reading_room', 'hostel', 'mess') THEN
    RAISE EXCEPTION 'Invalid property_type: %', NEW.property_type;
  END IF;
  RETURN NEW;
END;
$function$;

-- 2. Update mark_qr_attendance to support mess
CREATE OR REPLACE FUNCTION public.mark_qr_attendance(p_property_id uuid, p_property_type text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_name TEXT;
  v_phone TEXT;
  v_seat_or_bed_id UUID;
  v_booking_id UUID;
  v_seat_label TEXT;
  v_existing RECORD;
  v_property_name TEXT;
  v_meal_type TEXT;
  v_sub_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT name, phone INTO v_name, v_phone FROM profiles WHERE id = v_user_id;
  IF v_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  IF p_property_type = 'reading_room' THEN
    SELECT name INTO v_property_name FROM cabins WHERE id = p_property_id;
    IF v_property_name IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Property not found');
    END IF;

    -- Check already marked today
    SELECT id, check_in_time INTO v_existing
    FROM property_attendance
    WHERE student_id = v_user_id AND property_id = p_property_id AND date = CURRENT_DATE;
    IF v_existing.id IS NOT NULL THEN
      RETURN jsonb_build_object('success', true, 'already_marked', true, 'check_in_time', v_existing.check_in_time, 'student_name', v_name, 'phone', v_phone);
    END IF;

    SELECT b.id, b.seat_id, s.number
    INTO v_booking_id, v_seat_or_bed_id, v_seat_label
    FROM bookings b LEFT JOIN seats s ON s.id = b.seat_id
    WHERE b.user_id = v_user_id AND b.cabin_id = p_property_id
      AND b.payment_status IN ('completed', 'partial')
      AND b.start_date <= CURRENT_DATE AND b.end_date >= CURRENT_DATE
    ORDER BY b.created_at DESC LIMIT 1;

    IF v_booking_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'No active booking found at this property');
    END IF;

    IF EXISTS (SELECT 1 FROM dues WHERE user_id = v_user_id AND cabin_id = p_property_id AND status = 'pending' AND due_date < CURRENT_DATE) THEN
      RETURN jsonb_build_object('success', false, 'error', 'You have overdue payments. Please clear your dues first.');
    END IF;

    INSERT INTO property_attendance (student_id, property_id, property_type, seat_or_bed_id, booking_id, date)
    VALUES (v_user_id, p_property_id, p_property_type, v_seat_or_bed_id, v_booking_id, CURRENT_DATE);

  ELSIF p_property_type = 'hostel' THEN
    SELECT name INTO v_property_name FROM hostels WHERE id = p_property_id;
    IF v_property_name IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Property not found');
    END IF;

    SELECT id, check_in_time INTO v_existing
    FROM property_attendance
    WHERE student_id = v_user_id AND property_id = p_property_id AND date = CURRENT_DATE;
    IF v_existing.id IS NOT NULL THEN
      RETURN jsonb_build_object('success', true, 'already_marked', true, 'check_in_time', v_existing.check_in_time, 'student_name', v_name, 'phone', v_phone);
    END IF;

    SELECT hb.id, hb.bed_id, CONCAT(hr.room_number, '-B', hbd.bed_number)
    INTO v_booking_id, v_seat_or_bed_id, v_seat_label
    FROM hostel_bookings hb
    LEFT JOIN hostel_beds hbd ON hbd.id = hb.bed_id
    LEFT JOIN hostel_rooms hr ON hr.id = hb.room_id
    WHERE hb.user_id = v_user_id AND hb.hostel_id = p_property_id
      AND hb.status IN ('confirmed', 'pending')
      AND hb.start_date <= CURRENT_DATE AND hb.end_date >= CURRENT_DATE
    ORDER BY hb.created_at DESC LIMIT 1;

    IF v_booking_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'No active booking found at this hostel');
    END IF;

    IF EXISTS (SELECT 1 FROM hostel_dues WHERE user_id = v_user_id AND hostel_id = p_property_id AND status = 'pending' AND due_date < CURRENT_DATE) THEN
      RETURN jsonb_build_object('success', false, 'error', 'You have overdue payments. Please clear your dues first.');
    END IF;

    INSERT INTO property_attendance (student_id, property_id, property_type, seat_or_bed_id, booking_id, date)
    VALUES (v_user_id, p_property_id, p_property_type, v_seat_or_bed_id, v_booking_id, CURRENT_DATE);

  ELSIF p_property_type = 'mess' THEN
    SELECT name INTO v_property_name FROM mess_partners WHERE id = p_property_id;
    IF v_property_name IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Mess not found');
    END IF;

    -- Find active subscription
    SELECT id INTO v_sub_id
    FROM mess_subscriptions
    WHERE user_id = v_user_id AND mess_id = p_property_id
      AND status = 'active'
      AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE
    ORDER BY created_at DESC LIMIT 1;

    IF v_sub_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'No active mess subscription found');
    END IF;

    -- Auto-detect meal type based on time
    IF EXTRACT(HOUR FROM now() AT TIME ZONE 'Asia/Kolkata') < 11 THEN
      v_meal_type := 'breakfast';
    ELSIF EXTRACT(HOUR FROM now() AT TIME ZONE 'Asia/Kolkata') < 16 THEN
      v_meal_type := 'lunch';
    ELSE
      v_meal_type := 'dinner';
    END IF;

    -- Check duplicate for same meal today
    IF EXISTS (
      SELECT 1 FROM mess_attendance
      WHERE user_id = v_user_id AND mess_id = p_property_id
        AND date = CURRENT_DATE AND meal_type = v_meal_type
    ) THEN
      RETURN jsonb_build_object('success', true, 'already_marked', true, 'student_name', v_name, 'phone', v_phone, 'meal_type', v_meal_type, 'property_name', v_property_name);
    END IF;

    -- Insert mess attendance
    INSERT INTO mess_attendance (user_id, mess_id, subscription_id, date, meal_type, status, marked_at)
    VALUES (v_user_id, p_property_id, v_sub_id, CURRENT_DATE, v_meal_type, 'consumed', now());

    -- Also insert into property_attendance for unified tracking
    INSERT INTO property_attendance (student_id, property_id, property_type, booking_id, date)
    VALUES (v_user_id, p_property_id, 'mess', v_sub_id, CURRENT_DATE)
    ON CONFLICT DO NOTHING;

    RETURN jsonb_build_object(
      'success', true, 'already_marked', false,
      'student_name', v_name, 'phone', v_phone,
      'meal_type', v_meal_type,
      'property_name', v_property_name,
      'check_in_time', now()
    );
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid property type');
  END IF;

  RETURN jsonb_build_object(
    'success', true, 'already_marked', false,
    'student_name', v_name, 'phone', v_phone,
    'seat_label', v_seat_label,
    'property_name', v_property_name,
    'check_in_time', now()
  );
END;
$function$;

-- 3. Add columns to mess_subscriptions for offline booking
ALTER TABLE public.mess_subscriptions
  ADD COLUMN IF NOT EXISTS advance_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS collected_by_name text,
  ADD COLUMN IF NOT EXISTS payment_proof_url text;

-- 4. Create mess_dues table
CREATE TABLE IF NOT EXISTS public.mess_dues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES public.mess_subscriptions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  mess_id uuid REFERENCES public.mess_partners(id) NOT NULL,
  total_fee numeric DEFAULT 0,
  advance_paid numeric DEFAULT 0,
  paid_amount numeric DEFAULT 0,
  due_amount numeric DEFAULT 0,
  status text DEFAULT 'pending',
  due_date date NOT NULL,
  serial_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.mess_dues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mess dues visible to authenticated" ON public.mess_dues
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Create mess_due_payments table
CREATE TABLE IF NOT EXISTS public.mess_due_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  due_id uuid REFERENCES public.mess_dues(id) ON DELETE CASCADE NOT NULL,
  amount numeric DEFAULT 0,
  payment_method text DEFAULT 'cash',
  transaction_id text DEFAULT '',
  payment_proof_url text,
  collected_by uuid,
  collected_by_name text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.mess_due_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mess due payments visible to authenticated" ON public.mess_due_payments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Serial trigger for mess_dues
CREATE OR REPLACE FUNCTION public.set_serial_mess_dues()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.serial_number IS NULL THEN
    NEW.serial_number := generate_serial_number('MDUES');
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER set_serial_mess_dues_trigger
  BEFORE INSERT ON public.mess_dues
  FOR EACH ROW EXECUTE FUNCTION public.set_serial_mess_dues();

-- 7. Updated_at trigger for mess_dues
CREATE TRIGGER update_mess_dues_updated_at
  BEFORE UPDATE ON public.mess_dues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
