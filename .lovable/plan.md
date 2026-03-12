

# Replace Old Renewal Dialog with Seat Map Renewal Flow in Expiring Bookings

## Problem
The expiring bookings page uses `BookingExtensionDialog` which is an old API-based flow with a different UI. The user wants the exact same renewal process that exists in the VendorSeats seat map — same UI, same booking creation flow via `vendorSeatsService.createPartnerBooking`.

## Approach
Create a new standalone `RenewalSheet` component that extracts the renewal booking form from VendorSeats into a reusable Sheet/Dialog. This component will:
- Accept booking data (student info, seat info, cabin info, end date) as props
- Lock the student (no search/create)
- Force `isRenewMode` = true (no locker, start date = day after current end)
- Include all the same features: duration type pills, duration count, price calculation, discount, partial payment, payment method selector, payment proof, transaction ID, two-step confirm flow
- Use `vendorSeatsService.createPartnerBooking` for submission (same as seat map)

## Changes

### 1. New Component: `src/components/admin/RenewalSheet.tsx`
- A Sheet component that replicates the VendorSeats renewal booking form
- Props: `open`, `onOpenChange`, `booking` (with student, seat, cabin data), `onComplete`
- Includes: duration type selection (daily/weekly/monthly from cabin's allowed durations), duration count input, start/end date display, price calculation, discount fields, partial payment toggle, PaymentMethodSelector, PaymentProofUpload, transaction ID, two-step (details → confirm) flow
- Calls `vendorSeatsService.createPartnerBooking` with `isRenewMode`-equivalent data (lockerIncluded=false)
- Shows success view with invoice download option

### 2. Update `src/pages/admin/ExpiringBookingsPage.tsx`
- Remove `BookingExtensionDialog` import and usage
- Import and use the new `RenewalSheet` component
- Map expiring booking row data to the props the RenewalSheet expects (student name/phone/email, seat ID/price/number, cabin ID/name, end date)
- Fetch cabin's `allowed_durations` alongside existing query data

### 3. Update `src/api/adminBookingsService.ts`
- Add `allowed_durations` to the cabin select in `getExpiringBookings` query so renewal knows which duration types are allowed

### 4. Delete old `BookingExtensionDialog` if no longer used anywhere
- Check all imports — if only used in expiring bookings, remove it entirely

## Files Modified
- **New**: `src/components/admin/RenewalSheet.tsx`
- **Edit**: `src/pages/admin/ExpiringBookingsPage.tsx` — swap dialog for RenewalSheet
- **Edit**: `src/api/adminBookingsService.ts` — add `allowed_durations` to cabin select
- **Possible delete**: `src/components/admin/BookingExtensionDialog.tsx` (if unused elsewhere)

