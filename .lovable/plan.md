

# Fix: Seats/Beds Shown as Available Due to RLS Blocking Cross-User Booking Visibility

## Root Cause

The availability logic queries the `bookings` and `hostel_bookings` tables to find conflicting reservations. However, **RLS policies restrict students to only see their own bookings** (`auth.uid() = user_id`). This means:

- When Student A checks seat availability, they cannot see Student B's bookings
- All seats booked by other users appear as "Available"
- The pre-payment safety check also fails silently for the same reason

This affects **both Reading Room seats and Hostel beds**.

## Solution

Create two **SECURITY DEFINER** database functions that bypass RLS to return only the booking conflict data needed (seat/bed IDs), without exposing any personal information. Then update the frontend services to call these functions instead of querying the tables directly.

---

## Step 1: Create Database Functions

### Function 1: `get_conflicting_seat_bookings`
Returns seat IDs that have active bookings overlapping a given date range for a cabin, with optional slot filtering.

```sql
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
```

### Function 2: `get_conflicting_hostel_bookings`
Returns bed IDs with active bookings overlapping a date range for a hostel, plus payment status for advance_paid logic.

```sql
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
```

### Function 3: `check_seat_available`
Single-seat availability check for the pre-payment safety net.

```sql
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
```

### Function 4: `check_hostel_bed_available`
Single-bed availability check for the pre-payment safety net.

```sql
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
```

---

## Step 2: Update `src/api/seatsService.ts`

### `getAvailableSeatsForDateRange` -- replace direct bookings query with RPC call:
```typescript
// Instead of: supabase.from('bookings').select('seat_id, slot_id')...
const { data: bookings } = await supabase.rpc('get_conflicting_seat_bookings', {
  p_cabin_id: cabinId,
  p_start_date: startDate.split('T')[0],
  p_end_date: endDate.split('T')[0],
});
```

### `checkSeatsAvailabilityBulk` -- same RPC call replacement

### `checkSeatAvailability` -- use `check_seat_available` RPC:
```typescript
const { data: isAvailable } = await supabase.rpc('check_seat_available', {
  p_seat_id: seatId,
  p_start_date: startDate,
  p_end_date: endDate,
});
```

---

## Step 3: Update `src/components/hostels/HostelBedMap.tsx`

Replace the direct `hostel_bookings` query with RPC:
```typescript
// Instead of: supabase.from('hostel_bookings').select(...)
const { data: bookings } = await supabase.rpc('get_conflicting_hostel_bookings', {
  p_hostel_id: hostelId,
  p_start_date: startDate || null,
  p_end_date: endDate || null,
});
```

## Step 4: Update `src/components/hostels/HostelBedLayoutView.tsx`

Same RPC replacement as HostelBedMap.

## Step 5: Update `src/pages/HostelRoomDetails.tsx`

Replace the pre-payment direct query with `check_hostel_bed_available` RPC:
```typescript
const { data: isAvailable } = await supabase.rpc('check_hostel_bed_available', {
  p_bed_id: selectedBed.id,
  p_start_date: format(checkInDate, 'yyyy-MM-dd'),
  p_end_date: format(endDate, 'yyyy-MM-dd'),
});
if (!isAvailable) {
  // Block booking
}
```

---

## Files Modified

| File | Change |
|------|--------|
| **Database migration** | Create 4 SECURITY DEFINER functions |
| `src/api/seatsService.ts` | Use `get_conflicting_seat_bookings` and `check_seat_available` RPCs |
| `src/components/hostels/HostelBedMap.tsx` | Use `get_conflicting_hostel_bookings` RPC |
| `src/components/hostels/HostelBedLayoutView.tsx` | Use `get_conflicting_hostel_bookings` RPC |
| `src/pages/HostelRoomDetails.tsx` | Use `check_hostel_bed_available` RPC |

## Security Notes
- The RPC functions only return seat/bed IDs and minimal data (no PII exposed)
- SECURITY DEFINER bypasses RLS safely since the functions have a narrow, read-only scope
- No changes to existing RLS policies needed
- No UI or business logic changes

