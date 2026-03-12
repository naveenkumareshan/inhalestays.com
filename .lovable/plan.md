

# Fix: Payment Proof URL Not Being Saved to Database

## Problem
The payment proof screenshot upload component (`PaymentProofUpload`) is present in the UI across all booking and due collection flows, but the uploaded URL (`paymentProofUrl`) is **never actually saved** to the database. It's captured in state but not included in any insert/update calls. This means:
- Screenshots are uploaded to storage but not linked to bookings/receipts
- Neither the Booking Detail page nor the Reconciliation page can display them

## Root Cause
The `payment_proof_url` column exists on `bookings`, `hostel_bookings`, `receipts`, and `hostel_receipts` tables, but the code never passes the proof URL value when inserting records.

## Changes

### 1. VendorSeats (Reading Room Booking + Due Collection)
**File: `src/pages/vendor/VendorSeats.tsx`**
- Pass `paymentProofUrl` into the `PartnerBookingData` object sent to `createPartnerBooking`
- Pass `paymentProofUrl` into the `collectDuePayment` call

### 2. vendorSeatsService (Service Layer)
**File: `src/api/vendorSeatsService.ts`**
- Add `paymentProofUrl?: string` to `PartnerBookingData` interface
- Include `payment_proof_url` in the `bookings` insert
- Include `payment_proof_url` in the `receipts` insert (booking payment)
- Add `paymentProofUrl` param to `collectDuePayment` method
- Include `payment_proof_url` in `due_payments` insert and `receipts` insert (due collection)

### 3. HostelBedMap (Hostel Booking + Due Collection)
**File: `src/pages/admin/HostelBedMap.tsx`**
- Include `payment_proof_url: paymentProofUrl` in `hostel_bookings` insert
- Include `payment_proof_url: paymentProofUrl` in `hostel_receipts` insert (booking)
- Include `payment_proof_url: paymentProofUrl` in `hostel_receipts` insert (due collection)

### 4. ManualBookingManagement
**File: `src/pages/admin/ManualBookingManagement.tsx`**
- Pass `paymentProofUrl` in the booking data sent to `createManualCabinBooking`

### 5. BookingExtensionDialog
**File: `src/components/admin/BookingExtensionDialog.tsx`**
- Include `paymentProofUrl` in the extension/transaction data

### 6. CheckInFinancials CollectDrawer
**File: `src/components/admin/operations/CheckInFinancials.tsx`**
- Add `PaymentProofUpload` component to the collect drawer for non-cash methods
- Include `payment_proof_url` in the `due_payments`, `hostel_due_payments`, `receipts`, and `hostel_receipts` inserts

## Files Modified
- `src/api/vendorSeatsService.ts` — interface + insert updates
- `src/pages/vendor/VendorSeats.tsx` — pass proof URL to service calls
- `src/pages/admin/HostelBedMap.tsx` — include proof URL in inserts
- `src/pages/admin/ManualBookingManagement.tsx` — include proof URL in booking data
- `src/components/admin/BookingExtensionDialog.tsx` — include proof URL
- `src/components/admin/operations/CheckInFinancials.tsx` — add upload + save proof URL

