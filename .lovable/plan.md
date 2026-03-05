

# Deep Audit: Partner-Side Hostel & Reading Room Issues

## Critical Issues Found

### Issue 1: Partners/Employees CANNOT manage seats (CRITICAL)
The `seats` table only has:
- `Admins can manage seats` (ALL for admin role)
- `Anyone can view seats` (SELECT for public)

**No partner or employee policies exist.** This means:
- `updateSeatPrice()` silently fails for partners
- `toggleSeatAvailability()` (block/unblock) silently fails for partners
- Partners see seats but can't edit prices or block/unblock them
- All seat management operations by partners return empty results with no error

### Issue 2: Partners CANNOT update hostel bookings (CRITICAL)
`hostel_bookings` has partner INSERT but **no partner UPDATE policy**. This means:
- Partners can create bookings but can't update payment status
- The due collection flow in `HostelBedMap.tsx` (line 527-531) updates `hostel_bookings.remaining_amount` and `payment_status` — this **silently fails** for partners
- Partners can't cancel or modify hostel bookings they created

### Issue 3: Employees CANNOT manage hostel rooms
`hostel_rooms` only has:
- Admin ALL
- Partners can manage own hostel rooms
- Anyone can view active hostel rooms

No employee policy. Since `HostelBedMap.tsx` uses `!inner` join on `hostel_rooms`, and employee can only see rooms with `is_active = true` via the public policy, employees may lose visibility on inactive rooms.

### Issue 4: VendorSeats color contrast not updated
`VendorSeats.tsx` (line 690-698) still uses subtle `-50` tint colors (`bg-emerald-50`, `bg-red-50`, `bg-amber-50`) while `HostelBedMap.tsx` was updated to use `-100` tints. This is an inconsistency — seats page has the same visibility problem that was just fixed for hostel beds.

## Fix Plan

### Database Migration: Add 4 missing RLS policies

```sql
-- 1. Partners/Employees can manage their own cabin seats
CREATE POLICY "Partners can manage own seats"
ON public.seats FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM cabins c WHERE c.id = seats.cabin_id AND is_partner_or_employee_of(c.created_by)))
WITH CHECK (EXISTS (SELECT 1 FROM cabins c WHERE c.id = seats.cabin_id AND is_partner_or_employee_of(c.created_by)));

-- 2. Partners can update their own hostel bookings
CREATE POLICY "Partners can update bookings for own hostels"
ON public.hostel_bookings FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM hostels h WHERE h.id = hostel_bookings.hostel_id AND h.created_by = auth.uid()));

-- 3. Employees can manage employer hostel rooms
CREATE POLICY "Employees can manage employer hostel rooms"
ON public.hostel_rooms FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM hostels h WHERE h.id = hostel_rooms.hostel_id AND is_partner_or_employee_of(h.created_by)))
WITH CHECK (EXISTS (SELECT 1 FROM hostels h WHERE h.id = hostel_rooms.hostel_id AND is_partner_or_employee_of(h.created_by)));
```

### Code Fix: Update VendorSeats color palette
In `src/pages/vendor/VendorSeats.tsx`, update `statusColors` (line 690-698) to match the HostelBedMap vivid colors:
- `bg-emerald-50` → `bg-emerald-100`, `border-emerald-400` → `border-emerald-500`
- `bg-red-50` → `bg-red-100`, `border-red-400` → `border-red-500`
- `bg-amber-50` → `bg-amber-100`, `border-amber-400` → `border-amber-500`

Also update the legend indicators (~line 850) to use the matching `500` shade colors.

### Files Changed
- **Database migration**: 3 new RLS policies
- **`src/pages/vendor/VendorSeats.tsx`**: Status color contrast update

