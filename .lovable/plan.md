

# Plan: Allow Past Start Dates for Partner Offline Bookings

## Problem
In both the Reading Room partner page (`VendorSeats.tsx`) and the Hostel partner page (`HostelBedMap.tsx`), the start date calendar **disables all past dates** for first-time bookings. This prevents partners from backdating offline bookings — e.g., when a student started 3 days ago but the partner is entering it now.

The end date auto-calculation already works correctly in both flows.

## Changes

### 1. `src/pages/vendor/VendorSeats.tsx` (Reading Room partner booking)
**Line ~1422-1427**: Remove the past-date restriction for first-time (non-renew, non-future) bookings. Allow any date selection so partners can backdate offline entries.

Current:
```typescript
disabled={(date) => {
  if (isRenewMode || showFutureBooking) {
    return date < bookingStartDate;
  }
  return date < new Date(new Date().toDateString());
}}
```

Change to: For first-time bookings, no date restriction (or optionally limit to e.g. 90 days in the past to prevent accidental far-past selections).

### 2. `src/pages/admin/HostelBedMap.tsx` (Hostel partner booking)
**Line ~1311-1315**: Same fix — remove the past-date restriction for first-time hostel bookings (when `showFutureBooking` is false and there's no current booking).

Current:
```typescript
disabled={(date) => {
  if (showFutureBooking && selectedBed?.currentBooking?.endDate) return date <= new Date(selectedBed.currentBooking.endDate);
  return date < new Date(new Date().toDateString());
}}
```

Change to: Allow past dates for first-time bookings.

### 3. `src/pages/admin/ManualBookingManagement.tsx` (Admin manual booking)
**Line 689**: The `<Input type="date">` already allows any date. No change needed here. The start date handler at line 348 also works fine.

## Files
| File | Change |
|------|--------|
| `src/pages/vendor/VendorSeats.tsx` | Remove past-date disable for first-time bookings (~2 lines) |
| `src/pages/admin/HostelBedMap.tsx` | Remove past-date disable for first-time bookings (~2 lines) |

