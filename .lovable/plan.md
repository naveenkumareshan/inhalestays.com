

# Fix: Seats/Beds Not Showing After Bookings

## Root Cause Analysis

After thorough investigation, two issues were identified:

### Issue 1: Silent Query Errors
Both `HostelBedMap.tsx` and `VendorSeats.tsx` have fetch functions that **don't capture query errors**. When a Supabase query fails for any reason, the error is silently swallowed and the page shows "No beds/seats match your filters" instead of surfacing the actual error.

**HostelBedMap.tsx** (`fetchBeds`, ~line 219):
```typescript
const { data: bedsData } = await bedsQuery.order('bed_number');
// ⚠️ error is never destructured — if query fails, bedsData = null → setBeds([])
```

**VendorSeats.tsx** (`fetchSeats`, ~line 179):
```typescript
const res = await vendorSeatsService.getSeatsForDate(...);
if (res.success && res.data) { setSeats(res.data); }
// ⚠️ if fetch fails, seats stay at [] (initial state), no error shown
```

### Issue 2: Missing Employee RLS Policies
Employees cannot create hostel bookings or update hostel bed availability because there are **no employee INSERT/UPDATE policies** on:
- `hostel_bookings` — no employee INSERT policy
- `hostel_beds` — no employee UPDATE policy

This means when an employee tries to book a hostel bed, the INSERT silently fails, and the bed update also fails.

## Fix Plan

### Database Migration: Add Missing Employee RLS Policies

```sql
-- Employee can insert hostel bookings for employer's hostels
CREATE POLICY "Employees can insert employer hostel bookings"
ON public.hostel_bookings FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM hostels h
  WHERE h.id = hostel_bookings.hostel_id
  AND is_partner_or_employee_of(h.created_by)
));

-- Employee can manage employer's hostel beds
CREATE POLICY "Employees can manage employer hostel beds"
ON public.hostel_beds FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM hostel_rooms r
  JOIN hostels h ON h.id = r.hostel_id
  WHERE r.id = hostel_beds.room_id
  AND is_partner_or_employee_of(h.created_by)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM hostel_rooms r
  JOIN hostels h ON h.id = r.hostel_id
  WHERE r.id = hostel_beds.room_id
  AND is_partner_or_employee_of(h.created_by)
));
```

### Code Fix 1: `src/pages/admin/HostelBedMap.tsx` — Add error handling to `fetchBeds`

In the `fetchBeds` callback (~line 207-335), capture errors from all three queries and show a toast when they fail instead of silently setting beds to empty:

```typescript
// Line ~219: capture error
const { data: bedsData, error: bedsError } = await bedsQuery.order('bed_number');
if (bedsError) {
  console.error('Error fetching beds:', bedsError);
  toast({ title: 'Error loading beds', description: bedsError.message, variant: 'destructive' });
  setRefreshing(false);
  return;
}

// Line ~241: capture error
const { data: bookingsData, error: bookingsError } = await bookingsQuery;
if (bookingsError) console.error('Error fetching bookings:', bookingsError);

// Line ~245: capture error
const { data: allBookingsData, error: allBookingsError } = await supabase...
if (allBookingsError) console.error('Error fetching all bookings:', allBookingsError);
```

### Code Fix 2: `src/pages/vendor/VendorSeats.tsx` — Add error feedback to `fetchSeats`

In the `fetchSeats` callback (~line 173-186), show a toast when seat fetch fails:

```typescript
const res = await vendorSeatsService.getSeatsForDate(selectedCabinId, dateStr, partnerCabinIds);
if (res.success && res.data) {
  setSeats(res.data);
} else if (!res.success) {
  toast({ title: 'Error loading seats', description: res.error || 'Failed to fetch seats', variant: 'destructive' });
}
```

### Files Changed
- **Database migration**: Add 2 employee RLS policies
- **`src/pages/admin/HostelBedMap.tsx`**: Add error handling to `fetchBeds`
- **`src/pages/vendor/VendorSeats.tsx`**: Add error toast to `fetchSeats`

