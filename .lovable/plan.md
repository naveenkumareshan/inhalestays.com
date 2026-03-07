

# Block Offline Bookings on Deactivated Properties

## Problem
When an admin deactivates a Reading Room (or hostel/mess/laundry), partners and employees can still create offline bookings. Instead, they should see the property name but get a "Contact admin to activate" message, with the booking form hidden.

## Changes

### 1. `src/api/vendorSeatsService.ts` — Include `is_active` in VendorCabin
- Add `isActive: boolean` to the `VendorCabin` interface
- Map `cabin.is_active` in the `getVendorCabins` response (~line 240-261)

### 2. `src/pages/vendor/VendorSeats.tsx` — Block booking on inactive cabins
- When a seat is clicked and its cabin is inactive, show an alert message: *"This Reading Room has been deactivated. Contact admin to activate."* instead of the booking form
- Check `selectedCabinInfo?.isActive === false` before the booking form section (~line 1307)
- Show an info card with `AlertTriangle` icon and the message
- Keep seat info (name, floor, status) visible but hide all booking actions (Book, Renew, Future Book buttons)

### 3. `src/pages/admin/ManualBookingManagement.tsx` — Filter or warn for inactive cabins
- When admin selects an inactive cabin in the manual booking page, show a warning but still allow (admin override). For non-admin users, disable cabin selection for inactive ones.

### 4. Hostel partner booking flows
- In hostel bed management views used by partners, add the same `is_active` check and show "Contact admin to activate this hostel" when the hostel is deactivated.

## Key Implementation Detail

In `VendorSeats.tsx`, around line 1307 where the booking form renders:

```typescript
{/* Deactivated cabin warning for non-admin */}
{selectedCabinInfo && selectedCabinInfo.isActive === false && user?.role !== 'admin' && (
  <div className="border border-amber-200 bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 text-center space-y-2">
    <AlertTriangle className="h-5 w-5 text-amber-600 mx-auto" />
    <p className="text-sm font-medium text-amber-700">This Reading Room has been deactivated</p>
    <p className="text-xs text-muted-foreground">Please contact admin to activate this Reading Room before making bookings.</p>
  </div>
)}

{/* Only show booking form if cabin is active OR user is admin */}
{(selectedSeat.dateStatus === 'available' || showFutureBooking) && canEdit && !bookingSuccess && 
 (selectedCabinInfo?.isActive !== false || user?.role === 'admin') && (
  // existing booking form...
)}
```

Also hide the Renew/Future Book buttons in the booked seat view when cabin is inactive for non-admins.

| File | Change |
|------|--------|
| `src/api/vendorSeatsService.ts` | Add `isActive` to VendorCabin interface and mapping |
| `src/pages/vendor/VendorSeats.tsx` | Block booking form + show warning when cabin inactive for non-admins |

