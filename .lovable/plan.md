

# Fix: Bookings Created Without Successful Payment

## Problem

Both reading room and hostel booking flows create a booking record in the database **before** payment is completed. If the student dismisses the Razorpay payment modal or payment fails, the booking remains in `pending` status indefinitely, blocking the seat/bed for other students.

### Specific bugs found:

1. **Reading Room (`RazorpayCheckout.tsx`)**: The `ondismiss` callback only shows a toast message and sets loading to false. It does NOT cancel the pending booking. The booking stays forever with `payment_status: 'pending'`, and `get_conflicting_seat_bookings` treats it as a valid booking (only excludes `cancelled`/`failed`).

2. **Hostel — `HostelRoomDetails.tsx`**: No `ondismiss` handler at all on the Razorpay modal. If the student closes the payment popup, the booking stays in `pending`/`confirmed` status and the DB trigger has already marked the bed as unavailable.

3. **Hostel — `HostelBooking.tsx`**: This flow correctly cancels on dismiss — no fix needed here.

## Changes

### 1. `src/components/payment/RazorpayCheckout.tsx` — Add booking cancellation on dismiss

The `RazorpayCheckout` component is used for reading room payments. Add an `onDismiss` callback prop so the parent can handle cancellation. Also, import `bookingsService` and cancel the booking automatically when the modal is dismissed.

- Add new optional prop: `onDismiss?: () => void`
- In `ondismiss` handler: call `onDismiss()` if provided

### 2. `src/components/seats/SeatBookingForm.tsx` — Cancel booking on payment dismiss

- Pass `onDismiss` callback to `RazorpayCheckout` that cancels the pending booking
- Call `bookingsService.cancelBooking(bookingId)` or update status to `cancelled`
- Reset the `bookingCreated` state so the student can try again

### 3. `src/pages/HostelRoomDetails.tsx` — Add ondismiss handler to Razorpay modal

- Add `ondismiss` to the `rzpOptions.modal` that calls `hostelBookingService.cancelBooking(booking.id, 'Payment cancelled by user')`
- This matches the pattern already used in `HostelBooking.tsx`

### 4. `src/api/bookingsService.ts` — Add cancelBooking method

- Add a `cancelBooking` method that updates `payment_status` to `cancelled` for the given booking ID
- This is needed for reading room bookings (hostel already has `cancelBooking`)

**4 files, focused fixes. No database changes needed — the existing `get_conflicting_seat_bookings` already excludes `cancelled`/`failed` statuses, and the hostel bed trigger already releases beds when status changes away from `confirmed`/`pending`.**

