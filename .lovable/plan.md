

# Fix: Hostel Booking Created Before Payment Confirmation

## Root Cause

In `src/pages/HostelBooking.tsx` (line 197), the booking is created **before** the Razorpay payment modal opens:

```
1. hostelBookingService.createBooking(bookingData)  ← booking inserted with status='pending'
2. razorpayService.createOrder(...)                  ← Razorpay order created
3. rzp.open()                                        ← payment modal opens
4. User closes modal / payment fails                 ← booking stays as 'pending' forever
```

The `createBooking` call (line 47-57 of `hostelBookingService.ts`) inserts the booking with `status: 'pending'` and `payment_status: 'pending'` since no `razorpay_payment_id` exists yet. The database trigger then marks the bed as unavailable.

There is **no `modal.ondismiss` handler** on the Razorpay options (line 240-276), so when the user closes/cancels the payment modal, the pending booking is never cleaned up. The bed stays blocked, and the booking shows up in operations.

Additionally, if the `razorpayService.createOrder()` call fails after booking creation (line 214-216), the `throw` goes to the catch block but never cancels the already-created booking.

## Fix Plan

### Change 1: `src/pages/HostelBooking.tsx` — Add cleanup on payment failure/dismissal

Add `modal.ondismiss` handler to cancel the booking when payment is dismissed, and cancel the booking if order creation fails:

```typescript
// After line 216 (order creation failure), cancel the booking:
if (!orderResponse.success || !orderResponse.data) {
  await hostelBookingService.cancelBooking(booking.id, 'Payment order creation failed');
  throw new Error(...);
}

// In razorpayOptions (~line 240), add modal.ondismiss:
modal: {
  ondismiss: async () => {
    await hostelBookingService.cancelBooking(booking.id, 'Payment cancelled by user');
    toast({ title: "Booking Cancelled", description: "Payment was not completed", variant: "destructive" });
    setIsProcessing(false);
  },
},

// In the handler's catch block (~line 268), cancel on verification failure:
catch (err) {
  await hostelBookingService.cancelBooking(booking.id, 'Payment verification failed');
  toast({ ... });
}
```

### Change 2: `src/pages/HostelBooking.tsx` — Also cancel on outer catch

The outer catch block (~line 277) should also attempt to cancel any created booking. Use a `bookingRef` to track the created booking ID:

```typescript
let createdBookingId: string | null = null;
// After booking creation:
createdBookingId = booking.id;
// In outer catch:
if (createdBookingId) {
  await hostelBookingService.cancelBooking(createdBookingId, 'Booking process failed');
}
```

### Files Changed
- **`src/pages/HostelBooking.tsx`**: Add payment dismissal/failure cleanup handlers to cancel pending bookings

