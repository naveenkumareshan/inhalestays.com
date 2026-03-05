
CREATE OR REPLACE FUNCTION sync_hostel_bed_availability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IN ('confirmed', 'pending') THEN
      UPDATE hostel_beds SET is_available = false WHERE id = NEW.bed_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IN ('confirmed', 'pending') AND NEW.status NOT IN ('confirmed', 'pending') THEN
      IF NOT EXISTS (
        SELECT 1 FROM hostel_bookings
        WHERE bed_id = NEW.bed_id
          AND id != NEW.id
          AND status IN ('confirmed', 'pending')
          AND end_date >= CURRENT_DATE
      ) THEN
        UPDATE hostel_beds SET is_available = true WHERE id = NEW.bed_id;
      END IF;
    END IF;
    IF OLD.bed_id IS DISTINCT FROM NEW.bed_id THEN
      IF NOT EXISTS (
        SELECT 1 FROM hostel_bookings
        WHERE bed_id = OLD.bed_id AND id != NEW.id
          AND status IN ('confirmed', 'pending') AND end_date >= CURRENT_DATE
      ) THEN
        UPDATE hostel_beds SET is_available = true WHERE id = OLD.bed_id;
      END IF;
      UPDATE hostel_beds SET is_available = false WHERE id = NEW.bed_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_sync_hostel_bed_availability
AFTER INSERT OR UPDATE ON hostel_bookings
FOR EACH ROW
EXECUTE FUNCTION sync_hostel_bed_availability();

UPDATE hostel_beds SET is_available = false
WHERE id IN (
  SELECT DISTINCT bed_id FROM hostel_bookings
  WHERE status IN ('confirmed', 'pending')
    AND end_date >= CURRENT_DATE
)
AND is_available = true;
