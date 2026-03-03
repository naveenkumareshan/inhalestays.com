
-- Step 1: Reassign IS-booking- bookings to IS-BOOK- with new unique sequence numbers (17-21)
UPDATE bookings SET serial_number = 'IS-BOOK-2026-00017' WHERE id = '4be8cbbf-f22f-4cb2-8a46-d850e2869cf1';
UPDATE bookings SET serial_number = 'IS-BOOK-2026-00018' WHERE id = '2f9b5488-6daf-4463-b7ad-40798a20dbfa';
UPDATE bookings SET serial_number = 'IS-BOOK-2026-00019' WHERE id = '66e1a236-c7a8-4105-b090-d8b737598560';
UPDATE bookings SET serial_number = 'IS-BOOK-2026-00020' WHERE id = '97b9c477-3cb1-4a9f-a9b9-7ea8e2bfdc9e';
UPDATE bookings SET serial_number = 'IS-BOOK-2026-00021' WHERE id = 'e506380e-ad1e-467f-abdb-5ac6c5a4e39a';

-- Step 2: Update BOOK counter to 21 (16 existing + 5 merged)
UPDATE serial_counters SET current_seq = 21 WHERE entity_type = 'BOOK' AND year = 2026;

-- Step 3: Remove orphaned 'booking' counter
DELETE FROM serial_counters WHERE entity_type = 'booking' AND year = 2026;

-- Step 4: Make generate_serial_number case-insensitive to prevent future issues
CREATE OR REPLACE FUNCTION public.generate_serial_number(p_entity_type text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_year integer := EXTRACT(YEAR FROM now())::integer;
  v_seq integer;
  v_upper_type text := UPPER(p_entity_type);
BEGIN
  INSERT INTO public.serial_counters (entity_type, year, current_seq)
  VALUES (v_upper_type, v_year, 1)
  ON CONFLICT (entity_type, year)
  DO UPDATE SET current_seq = serial_counters.current_seq + 1
  RETURNING current_seq INTO v_seq;

  RETURN 'IS-' || v_upper_type || '-' || v_year::text || '-' || lpad(v_seq::text, 5, '0');
END;
$function$;
