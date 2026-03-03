

# Fix Booking Dates, Locker Logic, Receipts, Slot Pricing, Exports, and Calendar Restrictions

## 8 Issues to Fix

---

### 1. Renewal Must Not Charge Locker Deposit Again

**Problem**: When a partner/admin renews a seat, the locker checkbox is still shown and the locker deposit gets added to the renewal total. Locker deposit is a one-time charge -- it should only be collected on the first booking for a seat.

**Files to modify**:
- `src/pages/vendor/VendorSeats.tsx` (lines 1315-1330): When `isRenewMode` is true, force `lockerIncluded = false` and hide the locker checkbox. The existing `BookingRenewal.tsx` already handles this correctly (sets `locker_included: false, locker_price: 0`).

**Logic**: Add a condition to skip locker display when `isRenewMode === true`. Also ensure `lockerIncluded` is reset to `false` when entering renew mode (around line 990).

---

### 2. Seat Expiring Date Should Reflect Future Bookings

**Problem**: When a seat has future bookings, its "Expiring till" badge still shows the current booking's end date instead of the latest future booking's end date.

**Files to modify**:
- `src/api/vendorSeatsService.ts` or the seat status calculation: The "expiring" status and its displayed date should consider future bookings. Need to find where `expiringDate` or the badge text "till XX" is computed.
- `src/pages/vendor/VendorSeats.tsx` (around line 910-930): The header area showing "Expiring till XX" should use the latest end date from all bookings (current + future) for that seat.

**Logic**: When displaying the seat's expiry info, iterate through `selectedSeat.allBookings` and use the maximum `endDate` instead of just the current booking's `endDate`.

---

### 3. Receipts Should Show Date + Time

**Problem**: The receipts table only shows the date, not the time, for payment records.

**Files to modify**:
- `src/pages/admin/Receipts.tsx` (line 295): Change `toLocaleDateString` to `toLocaleString` with time formatting.
- Mobile cards view (line 245): Same change.

**Format**: `dd MMM yyyy, HH:mm` (e.g., "03 Mar 2026, 14:30")

---

### 4. Online Razorpay Payments: "Collected By" Should Be "InhaleStays.com"

**Problem**: Receipts created by the `razorpay-verify-payment` edge function don't set `collected_by_name`. The field defaults to empty, showing as "-" in receipts.

**Files to modify**:
- `supabase/functions/razorpay-verify-payment/index.ts`:
  - Line 273 (regular bookings receipt insert): Add `collected_by_name: 'InhaleStays.com'`
  - Line 231 (hostel receipts insert): Add `collected_by_name: 'InhaleStays.com'`
  - Line 252 (laundry receipts insert): Add `collected_by_name: 'InhaleStays.com'`
  - Test mode sections (~line 56): Same changes.

- `src/components/booking/BookingRenewal.tsx` (lines 462, 480): Change `'Online Payment'` to `'InhaleStays.com'` for renewal receipts.

---

### 5. Export Buttons for Admin Bookings, Deposits, and Receipts

**Problem**: Admin needs export functionality for bookings, deposits, and receipts pages. Partners should have export available based on their subscription access.

**Files to modify**:
- `src/pages/admin/Receipts.tsx`: Add an "Export CSV" button next to the Refresh button. Export filtered receipts data (serial_number, student, room, amount, method, type, date+time, collected_by, txn_id).
- `src/components/admin/AdminBookingsList.tsx`: Add an "Export" button that exports the currently filtered bookings list as CSV.
- `src/components/admin/DepositManagement.tsx`: Already has export -- verify it works.

**Implementation**: Use a simple CSV download approach (create CSV string, trigger download via blob URL). No additional dependencies needed.

---

### 6. Daily Booking End Date = Same Date for 1 Day (Fix Everywhere)

**Problem**: In the partner/admin offline booking flow (`VendorSeats.tsx`), a 1-day daily booking still calculates `addDays(start, 1)` instead of `addDays(start, 0)` for same-day checkout. The student-side `SeatBookingForm.tsx` was already fixed.

**Files to modify**:
- `src/pages/vendor/VendorSeats.tsx` (line 396): Change `addDays(bookingStartDate, selectedDuration.count)` to `addDays(bookingStartDate, Math.max(0, selectedDuration.count - 1))` for daily bookings.
- `src/pages/admin/ManualBookingManagement.tsx` (lines 269-280): The date calculation uses `setMonth` for all durations and only supports monthly. Add daily/weekly support with same-day logic for 1-day bookings.

---

### 7. Slot Prices Should Adjust for Daily/Weekly Duration

**Problem**: In the student booking flow (`SeatBookingForm.tsx`), the time slot radio buttons always show the monthly slot price (e.g., "Full Day ₹2000", "Morning ₹1000"). When "Daily" is selected, the displayed slot prices should reflect the daily rate (e.g., "Full Day ₹67/day", "Morning ₹33/day").

**Files to modify**:
- `src/components/seats/SeatBookingForm.tsx` (lines 748-770): Update the slot display to show the adjusted price based on `selectedDuration.type`. For daily: `Math.round(slot.price / 30)`, for weekly: `Math.round(slot.price / 4)`.
- `src/pages/vendor/VendorSeats.tsx` (lines 1262-1278): Same fix for the partner-side slot selector. Show adjusted slot prices based on duration type.

---

### 8. Renew Calendar Should Not Allow Past/Invalid Dates

**Problem**: When the partner opens the "Renew" flow, the system correctly pre-fills the start date as the day after the latest booking end date. But the calendar still allows selecting past dates or dates before the pre-filled start.

**Files to modify**:
- `src/pages/vendor/VendorSeats.tsx` (lines 1294-1301): The calendar `disabled` function should enforce:
  - In renew mode: minimum date = the pre-filled `bookingStartDate` (day after latest booking end). Back dates should be disabled.
  - In future booking mode: minimum date = day after latest booking end.

**Logic**: Update the `disabled` callback to use the minimum allowed date based on mode:
```text
disabled={(date) => {
  if (isRenewMode || showFutureBooking) {
    return date < bookingStartDate;
  }
  return date < new Date(new Date().toDateString());
}}
```

---

## Summary of All Files to Modify

| File | Changes |
|------|---------|
| `src/pages/vendor/VendorSeats.tsx` | Fix daily end date calc (6), hide locker on renew (1), update expiry badge with future bookings (2), adjust slot prices for duration (7), restrict calendar dates (8) |
| `supabase/functions/razorpay-verify-payment/index.ts` | Add `collected_by_name: 'InhaleStays.com'` to all receipt inserts (4) |
| `src/pages/admin/Receipts.tsx` | Show date+time (3), add CSV export button (5) |
| `src/components/seats/SeatBookingForm.tsx` | Adjust slot price display for daily/weekly (7) |
| `src/components/booking/BookingRenewal.tsx` | Change 'Online Payment' to 'InhaleStays.com' (4) |
| `src/pages/admin/ManualBookingManagement.tsx` | Add daily/weekly duration support with correct date calc (6) |
| `src/components/admin/AdminBookingsList.tsx` | Add CSV export button (5) |

