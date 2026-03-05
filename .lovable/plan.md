

# Fix: Hostel Beds Show as Available After Booking

## Root Cause

The `hostel_beds.is_available` flag is **not being updated** when students book beds online. Here's why:

1. In `hostelBookingService.ts` (line 64), after creating a booking, the code runs:
   ```typescript
   await supabase.from('hostel_beds').update({ is_available: false }).eq('id', bedId);
   ```
2. **Students have no UPDATE permission on `hostel_beds`** — the RLS policies only grant UPDATE to admins, partners, and employees. So this update **silently fails** for student bookings.

3. While the admin bed map (`HostelBedMap.tsx` page) correctly determines status from booking data (not the `is_available` flag), the **student-facing booking flow** checks `is_available` before allowing a booking (line 42-44 of `hostelBookingService.ts`). Additionally, the student-facing bed map component also uses `b.is_available` in its availability calculation.

4. Result: After a student books bed X, `is_available` remains `true` → bed X appears available to the next student → **double bookings become possible**, and the visual bed map shows booked beds as available.

This also explains why **partner-created bookings** work — partners have UPDATE permission on `hostel_beds`, so the flag gets set correctly.

## Fix: Database Trigger for Automatic `is_available` Sync

Instead of relying on application code (which fails when the user lacks permissions), add a database trigger that automatically updates `hostel_beds.is_available` when bookings are created or cancelled.

### Migration SQL

```sql
-- Trigger: Auto-set bed is_available=false when booking is created
CREATE OR REPLACE FUNCTION sync_hostel_bed_availability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- New booking → mark bed unavailable
    IF NEW.status IN ('confirmed', 'pending') THEN
      UPDATE hostel_beds SET is_available = false WHERE id = NEW.bed_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Booking cancelled → check if any other active booking exists for this bed
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
    -- Bed transfer: update old and new bed
    IF OLD.bed_id != NEW.bed_id THEN
      -- Free old bed if no other active bookings
      IF NOT EXISTS (
        SELECT 1 FROM hostel_bookings
        WHERE bed_id = OLD.bed_id AND id != NEW.id
          AND status IN ('confirmed', 'pending') AND end_date >= CURRENT_DATE
      ) THEN
        UPDATE hostel_beds SET is_available = true WHERE id = OLD.bed_id;
      END IF;
      -- Mark new bed unavailable
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

-- Fix existing out-of-sync data: mark beds with active bookings as unavailable
UPDATE hostel_beds SET is_available = false
WHERE id IN (
  SELECT DISTINCT bed_id FROM hostel_bookings
  WHERE status IN ('confirmed', 'pending')
    AND end_date >= CURRENT_DATE
)
AND is_available = true;
```

### Code Cleanup

Remove the now-redundant manual `is_available` updates in:

1. **`src/api/hostelBookingService.ts`** (line 64): Remove `await supabase.from('hostel_beds').update(...)` — trigger handles it
2. **`src/pages/admin/HostelBedMap.tsx`** (line 795): Remove the manual update after booking creation — trigger handles it
3. **`src/pages/admin/HostelBedMap.tsx`** (lines 489-490): Remove manual updates during bed transfer — trigger handles it
4. **`src/components/admin/HostelBedTransferManagement.tsx`** (lines 101-102): Remove manual updates — trigger handles it

### Files Changed
- **Database migration**: 1 trigger function + data fix for existing out-of-sync beds
- **`src/api/hostelBookingService.ts`**: Remove manual bed update
- **`src/pages/admin/HostelBedMap.tsx`**: Remove 2 manual bed updates
- **`src/components/admin/HostelBedTransferManagement.tsx`**: Remove manual bed update

