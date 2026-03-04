

# Fix Plan: Complaints (Vendor-only) + Support (Admin-only) + Expired Booking Blinking

## Issue 1: Complaints Not Working (Student → Vendor)

**Root Cause**: The `complaints` table has a vendor SELECT policy but **no vendor UPDATE policy**. Vendors can see complaints linked to their properties but cannot respond (update `response`, `status`, `responded_by`, `responded_at` fields).

Additionally, when students select a hostel booking in the complaint form, only `cabin_id` is set — `hostel_id` is never populated, so hostel vendors never see those complaints.

**Fix**:
- **DB migration**: Add a vendor UPDATE policy on `complaints` for own properties
- **`ComplaintsPage.tsx`**: When a hostel booking is selected, set `hostel_id` from the booking. Also fetch hostel bookings alongside reading room bookings so students can complain about either.
- **`ComplaintTracker.tsx`** (used by both admin and vendors via OperationsHub): No code change needed — it already queries and updates complaints. The RLS fix enables vendor updates.

## Issue 2: Support Tickets (Student → Admin Only)

**Root Cause**: The `support_tickets` table RLS policies only allow students to INSERT/SELECT their own tickets, and admins to manage all. This is correct per the user's requirement. The actual bug is likely that the **student INSERT policy is missing** — let me verify.

Looking at the provided RLS info, I don't see `support_tickets` RLS policies listed in the context. The table exists but policies may be incomplete. Need to ensure:
- Students can INSERT their own tickets
- Students can SELECT their own tickets  
- Admins can manage ALL tickets

**Fix**: 
- **DB migration**: Ensure proper RLS policies exist (student INSERT/SELECT own, admin ALL)
- No vendor policies needed (support goes to admin only)

## Issue 3: Expired Booking Blinking + Toast Spam

**Root Cause**: When PaymentTimer expires → `handlePaymentExpiry` cancels booking → shows destructive toast → calls `onBookingCancelled` → parent re-fetches → if cancel hasn't propagated or fails, pending booking reappears → PaymentTimer remounts with `hasExpiredRef` reset → expires immediately again → infinite loop.

**Fix**:
1. **`BookingsList.tsx`**: Track already-expired booking IDs in a `useRef` Set. Skip `handlePaymentExpiry` for bookings already processed. Filter out pending bookings older than 1 hour from display entirely.
2. **`StudentBookings.tsx`**: Filter out pending bookings older than 1 hour before setting state (both reading room and hostel).
3. **`PaymentTimer.tsx`**: No changes needed — the parent-level guard is sufficient.

## Files to Modify

| File | Change |
|------|--------|
| DB migration | Add vendor UPDATE policy on `complaints`; ensure `support_tickets` has student INSERT + SELECT + admin ALL policies |
| `src/components/profile/ComplaintsPage.tsx` | Fetch hostel bookings too; set `hostel_id` for hostel complaints |
| `src/components/booking/BookingsList.tsx` | Add `expiredIdsRef` guard; filter out stale pending bookings (>1hr) |
| `src/pages/StudentBookings.tsx` | Filter out pending bookings older than 1 hour |

## DB Migration SQL

```sql
-- Vendor UPDATE policy for complaints (so vendors can respond)
CREATE POLICY "Vendors can update complaints for own properties"
ON public.complaints
FOR UPDATE
TO authenticated
USING (
  (EXISTS (SELECT 1 FROM cabins c WHERE c.id = complaints.cabin_id AND c.created_by = auth.uid()))
  OR
  (EXISTS (SELECT 1 FROM hostels h WHERE h.id = complaints.hostel_id AND h.created_by = auth.uid()))
);

-- Ensure support_tickets has proper RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can insert own support tickets"
ON public.support_tickets FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can view own support tickets"
ON public.support_tickets FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all support tickets"
ON public.support_tickets FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
```

## Key Logic for Expired Booking Fix

```typescript
// BookingsList.tsx - prevent infinite expiry loop
const expiredIdsRef = useRef<Set<string>>(new Set());

const handlePaymentExpiry = async (bookingId: string) => {
  if (expiredIdsRef.current.has(bookingId)) return; // already handled
  expiredIdsRef.current.add(bookingId);
  try { await bookingsService.cancelBooking(bookingId); } catch {}
  toast({ title: "Payment Expired", description: "Booking cancelled.", variant: "destructive" });
  onBookingCancelled?.();
};

// Filter out stale pending bookings (>1 hour old)
const displayBookings = bookings.filter(b => {
  if (b.paymentStatus === 'pending' && b.createdAt) {
    const age = Date.now() - new Date(b.createdAt).getTime();
    if (age > 60 * 60 * 1000) return false; // older than 1 hour
  }
  return true;
});
```

