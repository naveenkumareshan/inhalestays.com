

# Fix: View Details Button & Custom Payment Method Labels in Partner/Admin Bookings

## Issues Identified

### Issue 1: "View Details" button not working (Admin & Partner Bookings page)
The `handleViewDetails` in `AdminBookingsList.tsx` navigates to:
```
/admin/bookings/${booking.bookingId}/cabin
```
Where `booking.bookingId` is the **serial_number** (e.g., "BK-001") or a truncated UUID substring.

However, `AdminBookingDetail` calls `adminBookingsService.getBookingById(bookingId)` which queries:
```sql
WHERE id = bookingId  -- expects a UUID
```

This fails because a serial_number like "BK-001" is not a valid UUID. The hostel path already has dual-lookup (serial_number first, then UUID), but the cabin path does not.

**Fix**: Update `getBookingById` in `adminBookingsService.ts` to first try `serial_number` lookup, then fall back to UUID lookup (same pattern as the hostel path in `AdminBookingDetail`).

### Issue 2: Custom payment method shows raw code instead of label
Three locations in `VendorSeats.tsx` display payment methods using hardcoded if/else that only handles `cash`, `upi`, `bank_transfer`:
- **Line 1232**: Booking success invoice view
- **Line 1731**: Current Bookings list
- **Line 2001**: Receipts dialog

Also, `AdminBookingsList.tsx` (the partner bookings table) doesn't display the payment method, but the current booking list in the seat map sheet does — and it shows raw `custom_<uuid>` values.

**Fix**: Import and use `resolvePaymentMethodLabels` and `getMethodLabel` from the shared utility in `VendorSeats.tsx`. Resolve custom labels when seat data loads, then use `getMethodLabel` everywhere payment method is displayed.

## Files to Modify

| File | Change |
|------|--------|
| `src/api/adminBookingsService.ts` | `getBookingById`: Add dual-lookup — try `serial_number` first, then `id` |
| `src/pages/vendor/VendorSeats.tsx` | Import payment label utilities; resolve custom labels on data load; replace 3 hardcoded payment method displays with `getMethodLabel` |

## Technical Details

### `adminBookingsService.ts` — `getBookingById`
```typescript
// Before: .eq('id', id).single()
// After: try serial_number first, fall back to id
let { data } = await supabase.from('bookings')
  .select('...')
  .eq('serial_number', id)
  .maybeSingle();
if (!data) {
  const res = await supabase.from('bookings')
    .select('...')
    .eq('id', id)
    .single();
  data = res.data;
}
```

### `VendorSeats.tsx` — Payment labels
Add state `paymentLabels` and resolve after fetching seats/bookings. Replace all three inline payment label mappings with `getMethodLabel(method, paymentLabels)`.

