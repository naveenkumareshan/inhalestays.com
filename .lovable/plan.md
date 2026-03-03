
# Fix Booking Payment, Pricing, Status, and Name Capture

## Issues Summary

1. **Header gradient color not matching brand** -- The `StudentBookingView` header uses `from-primary to-primary/80` which resolves to the brand deep blue. The screenshot shows a correct blue gradient. No change needed here as it IS the brand color.

2. **Daily booking shows "month(s)" in details** -- The Confirmation page (`src/pages/Confirmation.tsx`) hardcodes "month/months" regardless of booking duration type. The `StudentBookingView` already handles this correctly. Fix in Confirmation.tsx.

3. **Unpaid bookings showing as "Overdue" instead of "Cancelled"** -- In `StudentBookingView.tsx`, the payment status logic (line 315-316) marks any booking with remaining dues and expired end_date as "Overdue". But if initial payment was never made (no receipts, status still "pending"), it should show "Cancelled" or "Payment Not Completed". Fix the status derivation logic.

4. **Decimal precision issues (7.2000000...)** -- Multiple places use raw `.toFixed(2)` but the source values have floating point errors from division (e.g., `monthlyPrice / 30 * 1`). Fix by rounding to 2 decimal places in `SeatBookingForm.tsx` pricing calculations and in display formatters.

5. **Capture customer name during booking** -- The `bookings` table has no `customer_name` column. Need to add one via migration, capture it during the booking flow (from user profile or prompt), store it, and display it in booking details and booking lists.

---

## Technical Plan

### Task 1: Fix duration display in Confirmation page

**File: `src/pages/Confirmation.tsx`** (lines 148-163)
- Replace hardcoded "month/months" with proper duration-based labels using `booking.bookingDuration` field (`daily`/`weekly`/`monthly`).

### Task 2: Fix "Overdue" status for unpaid bookings

**File: `src/pages/students/StudentBookingView.tsx`** (lines 309-319)
- Update the `paymentStatus` derivation:
  - If `booking.payment_status === 'pending'` (never paid) and no receipts exist, show **"Payment Pending"** or if timer expired, it should be handled by the PaymentTimer auto-cancel
  - If `booking.payment_status === 'cancelled'` or `'failed'`, show **"Cancelled"/"Failed"**
  - Only show "Overdue" for `advance_paid` bookings with remaining dues past end date
  - Show "Partial" only for bookings that have some payment but still owe

**File: `src/components/booking/BookingsList.tsx`** (lines 195-205)
- Similar fix: bookings with `payment_status === 'pending'` and no payment should NOT show a "Due" badge -- they should show "Pending Payment"

### Task 3: Fix floating point decimal precision

**File: `src/components/seats/SeatBookingForm.tsx`**
- Line 320: daily price calc `(monthlyBasePrice / 30) * count` -- wrap in `Math.round(x * 100) / 100`
- Line 322: weekly price calc -- same rounding
- Lines 850, 886, 893, 1022: ensure all displayed amounts use `.toFixed(2)` after rounding
- Line 402: `handleCouponApply` discount amount -- round to 2 decimals

**File: `src/pages/students/StudentBookingView.tsx`**
- Lines 395-401: Already uses `.toFixed(2)` which is correct, but ensure source values are rounded

**General approach**: Add a utility function `roundPrice(n: number): number` that does `Math.round(n * 100) / 100` and use it in all pricing calculations.

### Task 4: Add customer name capture to booking flow

**Database Migration**: Add `customer_name` column to `bookings` table:
```sql
ALTER TABLE public.bookings ADD COLUMN customer_name text NOT NULL DEFAULT '';
```

**File: `src/components/seats/SeatBookingForm.tsx`**
- Add state `customerName` initialized from `user?.name || ''`
- If name is empty, show an input field in the "Review & Pay" section asking for their name
- Pass `customer_name` in the `createBooking` call
- Block booking creation if name is still empty

**File: `src/api/bookingsService.ts`**
- Add `customer_name` to the `BookingData` interface and include it in insert calls

**File: `src/pages/students/StudentBookingView.tsx`**
- Display `booking.customer_name` in the Booking Info section as "Booked By" row

**File: `src/components/booking/BookingsList.tsx`**
- Show customer name in the booking card if available

### Task 5: Fix header gradient color (if needed)

**File: `src/pages/students/StudentBookingView.tsx`** (line 331)
- The current gradient `from-primary to-primary/80` uses the brand blue (`hsl(207, 52%, 33%)`). If user wants it darker/different, adjust. Based on the screenshot it looks correct. Will keep as-is unless user clarifies.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Confirmation.tsx` | Fix duration labels for daily/weekly |
| `src/pages/students/StudentBookingView.tsx` | Fix payment status logic; add customer name display |
| `src/components/seats/SeatBookingForm.tsx` | Round pricing; add name capture input |
| `src/components/booking/BookingsList.tsx` | Fix status badges for unpaid bookings; show name |
| `src/api/bookingsService.ts` | Add customer_name to booking data |
| `src/utils/currency.ts` | Add `roundPrice` utility |
| **Migration** | Add `customer_name` column to bookings table |
