

# Add Mandatory Reason Field to Cancel/Release Dialogs

## Problem
Cancellations and releases are logged without any details (reason). The activity log shows "-" in the Details column, making auditing useless — there's no record of *why* a booking was cancelled or released.

## Solution
Add a required "Reason" textarea to all cancel and release confirmation dialogs. Pass the reason through to `logBookingActivity` in the `details` object.

## Changes

### 1. `src/pages/vendor/VendorSeats.tsx` — Reading Room seat map
- Add `cancelReason` and `releaseReason` state variables
- Add a `<Textarea>` with placeholder "Reason for cancellation..." inside the Cancel AlertDialog
- Add a `<Textarea>` with placeholder "Reason for release..." inside the Release AlertDialog
- Disable the confirm button when reason is empty
- Pass reason to `vendorSeatsService.cancelBooking()` and `releaseSeat()`
- Clear reason state when dialog closes

### 2. `src/api/vendorSeatsService.ts` — Service layer
- Update `cancelBooking` signature to accept optional `reason` parameter
- Update `releaseSeat` signature to accept optional `reason` parameter
- Pass `details: { reason }` to `logBookingActivity` calls

### 3. `src/pages/admin/HostelBedMap.tsx` — Hostel bed map
- Add `cancelReason` and `releaseReason` state variables
- Add `<Textarea>` fields in the Cancel and Release AlertDialogs
- Disable confirm buttons when reason is empty
- Pass `details: { reason }` to `logBookingActivity` calls in `handleReleaseBed` and `handleCancelHostelBooking`
- Clear reason state when dialogs close

### Files
- **Edit**: `src/pages/vendor/VendorSeats.tsx` — add reason textareas + pass to service
- **Edit**: `src/api/vendorSeatsService.ts` — accept reason param, log in details
- **Edit**: `src/pages/admin/HostelBedMap.tsx` — add reason textareas + pass to activity log

