
-- 1. Create shared sequence for property numbers
CREATE SEQUENCE IF NOT EXISTS property_number_seq;

-- 2. Add property_number column to all property tables
ALTER TABLE cabins ADD COLUMN IF NOT EXISTS property_number integer;
ALTER TABLE hostels ADD COLUMN IF NOT EXISTS property_number integer;
ALTER TABLE mess_partners ADD COLUMN IF NOT EXISTS property_number integer;
ALTER TABLE laundry_partners ADD COLUMN IF NOT EXISTS property_number integer;

-- 3. Backfill existing rows ordered by created_at
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM cabins ORDER BY created_at LOOP
    UPDATE cabins SET property_number = nextval('property_number_seq') WHERE id = r.id AND property_number IS NULL;
  END LOOP;
  FOR r IN SELECT id FROM hostels ORDER BY created_at LOOP
    UPDATE hostels SET property_number = nextval('property_number_seq') WHERE id = r.id AND property_number IS NULL;
  END LOOP;
  FOR r IN SELECT id FROM mess_partners ORDER BY created_at LOOP
    UPDATE mess_partners SET property_number = nextval('property_number_seq') WHERE id = r.id AND property_number IS NULL;
  END LOOP;
  FOR r IN SELECT id FROM laundry_partners ORDER BY created_at LOOP
    UPDATE laundry_partners SET property_number = nextval('property_number_seq') WHERE id = r.id AND property_number IS NULL;
  END LOOP;
END $$;

-- Set default for future rows
ALTER TABLE cabins ALTER COLUMN property_number SET DEFAULT nextval('property_number_seq');
ALTER TABLE hostels ALTER COLUMN property_number SET DEFAULT nextval('property_number_seq');
ALTER TABLE mess_partners ALTER COLUMN property_number SET DEFAULT nextval('property_number_seq');
ALTER TABLE laundry_partners ALTER COLUMN property_number SET DEFAULT nextval('property_number_seq');

-- 4. Create the new property-scoped serial generator
CREATE OR REPLACE FUNCTION public.generate_property_serial(
  p_property_id uuid,
  p_property_table text,
  p_type_code text,
  p_entity_code text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_prop_num integer;
  v_counter_key text;
  v_seq integer;
  v_year integer := EXTRACT(YEAR FROM now())::integer;
BEGIN
  IF p_property_table = 'cabins' THEN
    SELECT property_number INTO v_prop_num FROM cabins WHERE id = p_property_id;
  ELSIF p_property_table = 'hostels' THEN
    SELECT property_number INTO v_prop_num FROM hostels WHERE id = p_property_id;
  ELSIF p_property_table = 'mess_partners' THEN
    SELECT property_number INTO v_prop_num FROM mess_partners WHERE id = p_property_id;
  ELSIF p_property_table = 'laundry_partners' THEN
    SELECT property_number INTO v_prop_num FROM laundry_partners WHERE id = p_property_id;
  END IF;

  IF v_prop_num IS NULL THEN
    RETURN generate_serial_number(p_type_code || '-' || p_entity_code);
  END IF;

  v_counter_key := 'P' || lpad(v_prop_num::text, 5, '0') || '-' || p_type_code || '-' || p_entity_code;

  INSERT INTO public.serial_counters (entity_type, year, current_seq)
  VALUES (v_counter_key, v_year, 1)
  ON CONFLICT (entity_type, year)
  DO UPDATE SET current_seq = serial_counters.current_seq + 1
  RETURNING current_seq INTO v_seq;

  RETURN 'IS-' || lpad(v_prop_num::text, 5, '0') || '-' || p_type_code || '-' || p_entity_code || '-' || lpad(v_seq::text, 5, '0');
END;
$function$;

-- 5. Update trigger functions

CREATE OR REPLACE FUNCTION public.set_serial_bookings()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.serial_number IS NULL AND NEW.cabin_id IS NOT NULL THEN
    NEW.serial_number := generate_property_serial(NEW.cabin_id, 'cabins', 'RR', 'BK');
  ELSIF NEW.serial_number IS NULL THEN
    NEW.serial_number := generate_serial_number('BOOK');
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_serial_receipts()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.serial_number IS NULL AND NEW.cabin_id IS NOT NULL THEN
    NEW.serial_number := generate_property_serial(NEW.cabin_id, 'cabins', 'RR', 'RC');
  ELSIF NEW.serial_number IS NULL THEN
    NEW.serial_number := generate_serial_number('RCPT');
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_serial_dues()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.serial_number IS NULL AND NEW.cabin_id IS NOT NULL THEN
    NEW.serial_number := generate_property_serial(NEW.cabin_id, 'cabins', 'RR', 'DU');
  ELSIF NEW.serial_number IS NULL THEN
    NEW.serial_number := generate_serial_number('DUES');
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_serial_hostel_bookings()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.serial_number IS NULL AND NEW.hostel_id IS NOT NULL THEN
    NEW.serial_number := generate_property_serial(NEW.hostel_id, 'hostels', 'HS', 'BK');
  ELSIF NEW.serial_number IS NULL THEN
    NEW.serial_number := generate_serial_number('HBKNG');
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_serial_hostel_receipts()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.serial_number IS NULL AND NEW.hostel_id IS NOT NULL THEN
    NEW.serial_number := generate_property_serial(NEW.hostel_id, 'hostels', 'HS', 'RC');
  ELSIF NEW.serial_number IS NULL THEN
    NEW.serial_number := generate_serial_number('HRCPT');
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_serial_hostel_dues()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.serial_number IS NULL AND NEW.hostel_id IS NOT NULL THEN
    NEW.serial_number := generate_property_serial(NEW.hostel_id, 'hostels', 'HS', 'DU');
  ELSIF NEW.serial_number IS NULL THEN
    NEW.serial_number := generate_serial_number('HDUES');
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_serial_mess_subscriptions()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.serial_number IS NULL AND NEW.mess_id IS NOT NULL THEN
    NEW.serial_number := generate_property_serial(NEW.mess_id, 'mess_partners', 'M', 'BK');
  ELSIF NEW.serial_number IS NULL THEN
    NEW.serial_number := generate_serial_number('MSUB');
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_serial_mess_receipts()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.serial_number IS NULL AND NEW.mess_id IS NOT NULL THEN
    NEW.serial_number := generate_property_serial(NEW.mess_id, 'mess_partners', 'M', 'RC');
  ELSIF NEW.serial_number IS NULL THEN
    NEW.serial_number := generate_serial_number('MRCPT');
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_serial_mess_dues()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.serial_number IS NULL AND NEW.mess_id IS NOT NULL THEN
    NEW.serial_number := generate_property_serial(NEW.mess_id, 'mess_partners', 'M', 'DU');
  ELSIF NEW.serial_number IS NULL THEN
    NEW.serial_number := generate_serial_number('MDUES');
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_serial_laundry_orders()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.serial_number IS NULL AND NEW.laundry_partner_id IS NOT NULL THEN
    NEW.serial_number := generate_property_serial(NEW.laundry_partner_id, 'laundry_partners', 'L', 'BK');
  ELSIF NEW.serial_number IS NULL THEN
    NEW.serial_number := generate_serial_number('LNDRY');
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_serial_laundry_receipts()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.serial_number IS NULL AND NEW.laundry_partner_id IS NOT NULL THEN
    NEW.serial_number := generate_property_serial(NEW.laundry_partner_id, 'laundry_partners', 'L', 'RC');
  ELSIF NEW.serial_number IS NULL THEN
    NEW.serial_number := generate_serial_number('LRCPT');
  END IF;
  RETURN NEW;
END;
$function$;
