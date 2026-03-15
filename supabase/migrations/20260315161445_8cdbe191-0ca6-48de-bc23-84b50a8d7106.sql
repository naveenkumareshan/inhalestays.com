CREATE OR REPLACE FUNCTION public.set_serial_laundry_orders()
  RETURNS trigger LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.serial_number IS NULL AND NEW.partner_id IS NOT NULL THEN
    NEW.serial_number := generate_property_serial(NEW.partner_id, 'laundry_partners', 'L', 'BK');
  ELSIF NEW.serial_number IS NULL THEN
    NEW.serial_number := generate_serial_number('LNDRY');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_serial_laundry_receipts()
  RETURNS trigger LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.serial_number IS NULL AND NEW.partner_id IS NOT NULL THEN
    NEW.serial_number := generate_property_serial(NEW.partner_id, 'laundry_partners', 'L', 'RC');
  ELSIF NEW.serial_number IS NULL THEN
    NEW.serial_number := generate_serial_number('LRCPT');
  END IF;
  RETURN NEW;
END;
$$;