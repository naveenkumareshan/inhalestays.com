

# Fix: Hostel Booking Created Without Payment

## Problem
`hostelBookingService.createBooking()` determines `payment_status` and `status` based on `advance_amount` being passed in the request — before Razorpay payment actually completes. This causes:
1. Booking marked `confirmed` / `advance_paid` immediately
2. Receipt created for ₹2,400 without actual payment
3. Bed marked unavailable
4. If user closes browser (not Razorpay modal dismiss), the `ondismiss` handler never fires, leaving a ghost booking

## Immediate Data Fix
Run a migration to fix the specific booking and delete the false receipt:
- Set booking `e77057fe-...` to `status = 'cancelled'`, `payment_status = 'cancelled'`
- Delete the false receipt `IS-HRCPT-2026-00040`
- Bed availability will be restored by the `sync_hostel_bed_availability` trigger

## Code Fix

### 1. `src/api/hostelBookingService.ts` — `createBooking()`
- Always create booking with `payment_status: 'pending'` and `status: 'pending'`
- Remove the receipt creation logic (receipts should only be created after verified payment)
- Remove the hostel_dues creation for advance_paid (should happen post-payment)
- Keep the monthly_cycle pro-rated due creation only if `billing_type === 'monthly_cycle'` and payment is verified

### 2. `src/pages/HostelBooking.tsx` — payment handler
- In `razorpayOptions.handler` (successful payment callback): after `verifyPayment` succeeds, the edge function already handles status updates and receipt creation
- No changes needed here — the verify edge function handles confirmation

### 3. `supabase/functions/razorpay-verify-payment/index.ts`
- For hostel bookings: after signature verification, update `payment_status` to `advance_paid` or `completed` based on advance_amount vs total_price
- Create the receipt record
- Create hostel_dues entry if advance_paid

## Files Changed
1. **Migration SQL** — fix corrupted booking data
2. **`src/api/hostelBookingService.ts`** — createBooking always creates as pending, no receipt/dues creation
3. **`supabase/functions/razorpay-verify-payment/index.ts`** — handle hostel receipt + dues creation post-verification

## Summary
Bookings will always start as `pending`. Only after Razorpay payment is verified by the edge function will the booking be confirmed, receipt generated, and dues created. This eliminates ghost confirmed bookings from incomplete payments.

