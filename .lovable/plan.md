

# Fix "Page Not Found" on Profile Booking Links

## Problem
When clicking booking line items or the "Due" badge on the student profile page, the user gets "Page Not Found" because:

1. **Hostel bookings** link to `/student/hostel-bookings/:bookingId` -- but this route does NOT exist in `App.tsx`. There is no route defined for it at all.
2. **Reading room bookings** link to `/student/bookings/:bookingId` -- this route EXISTS and should work. If it's also showing "Page Not Found", it may be a serial_number mismatch issue.

## Solution

### Option A: Reuse the existing `StudentBookingView` for both types (Recommended)

The simplest fix: make `StudentBookingView` handle both reading room and hostel bookings, and route both types to the same path pattern.

### Changes

**1. `src/App.tsx`** -- Add the missing hostel booking route

Add a new route that points to the same `StudentBookingView` component:
```
/student/hostel-bookings/:bookingId  -->  StudentBookingView
```

**2. `src/pages/students/StudentBookingView.tsx`** -- Add hostel booking support

Currently this page only queries the `bookings` table. Update to:
- First try `bookings` table (reading room) by `serial_number`, then by `id`
- If not found, try `hostel_bookings` table by `serial_number`, then by `id`
- Fetch associated financial data from the correct table (`dues` vs `hostel_dues`, `receipts` vs `hostel_receipts`)
- Render the appropriate detail layout based on booking type (cabin info vs hostel/bed info)
- For the "Pay Due" button, use the correct Razorpay flow for the booking type

**3. `src/components/profile/ProfileManagement.tsx`** -- No changes needed

The navigation links are already correct (`/student/hostel-bookings/:id` and `/student/bookings/:id`).

## Technical Details

- The `StudentBookingView` will detect booking type by checking which table returns data
- Hostel bookings query: `hostel_bookings` joined with `hostels(name)`, `hostel_rooms(room_number)`, `hostel_beds(bed_number)`
- Hostel financial data: `hostel_dues` for due records, `hostel_receipts` for payment history
- Partner info lookup: use `hostels.created_by` for hostel bookings (same pattern as `cabins.created_by`)
- The "Pay Due" Razorpay flow passes the correct `bookingType` parameter (`hostel` vs `cabin`)

## Files to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/student/hostel-bookings/:bookingId` route pointing to `StudentBookingView` |
| `src/pages/students/StudentBookingView.tsx` | Add dual-table lookup (bookings + hostel_bookings), render hostel-specific details, use correct financial tables |

