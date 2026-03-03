
# Add Release Seat, Cancel Booking, and Fix Seat Availability During Due Period

## Two Changes

### 1. Add "Release Seat" and "Cancel Booking" Buttons

Add two new action buttons in the Partner Seat Control Center (VendorSeats) sheet when viewing a booked seat, with AlertDialog confirmation popups.

**Release Seat** (terminates booking, frees seat):
- Updates `bookings.payment_status` to `'terminated'`
- Updates `bookings.end_date` to today (checkout_date effect)
- Does NOT delete the booking record
- Seat becomes available immediately for new bookings

**Cancel Booking** (cancels entirely, cleans up dues):
- Updates `bookings.payment_status` to `'cancelled'`
- Seat becomes available immediately
- Updates any pending `dues` record for this booking to `status = 'cancelled'`
- Keeps all `receipts` and `due_payments` history unchanged

Both actions show an AlertDialog confirmation popup before executing.

### 2. Keep Seats/Beds Unavailable Throughout Booked Period (Even With Dues)

Currently, seats with `advance_paid` status auto-release after `proportional_end_date`. The user wants seats to stay **unavailable for the full booked period** regardless of due status. The partner should manually release the seat if needed.

**Changes to availability logic:**
- Remove the `proportional_end_date` check from `computeDateStatus()` in `vendorSeatsService.ts` -- seats with active bookings stay booked through `end_date`
- Remove the same check from `currentBookingRaw` selection logic
- Remove the `proportional_end_date` check from `HostelBedMap.tsx` and `HostelBedLayoutView.tsx` (student-facing hostel bed maps)
- The `check_seat_available` and `check_hostel_bed_available` RPCs already check the full date range (no proportional_end_date logic), so they're already correct
- The `getAvailableSeatsForDateRange` in `seatsService.ts` uses those RPCs, so student booking view is already correct

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/api/vendorSeatsService.ts` | Add `releaseSeat()` and `cancelBooking()` service methods; remove `proportional_end_date` auto-release logic from `computeDateStatus()` and `getSeatsForDate()` |
| `src/pages/vendor/VendorSeats.tsx` | Add Release Seat and Cancel Booking buttons with AlertDialog confirmation; import AlertDialog components |
| `src/components/hostels/HostelBedMap.tsx` | Remove proportional_end_date-based availability override |
| `src/components/hostels/HostelBedLayoutView.tsx` | Remove proportional_end_date-based availability override |

## Technical Details

### New Service Methods in `vendorSeatsService.ts`

```typescript
releaseSeat: async (bookingId: string) => {
  // 1. Update booking status to terminated, set end_date to today
  await supabase.from('bookings').update({
    payment_status: 'terminated',
    end_date: new Date().toISOString().split('T')[0],
  }).eq('id', bookingId);
  return { success: true };
}

cancelBooking: async (bookingId: string) => {
  // 1. Update booking status to cancelled
  await supabase.from('bookings').update({
    payment_status: 'cancelled',
  }).eq('id', bookingId);
  // 2. Cancel pending dues (don't delete)
  await supabase.from('dues').update({
    status: 'cancelled',
  }).eq('booking_id', bookingId).eq('status', 'pending');
  return { success: true };
}
```

### Availability Logic Change

In `computeDateStatus()`, remove lines 156-161 that check `proportional_end_date` and return `'available'`. The seat stays `'booked'` or `'expiring_soon'` for the full booking period.

In `getSeatsForDate()`, remove lines 344-351 that skip `currentBooking` display for advance_paid bookings past proportional_end_date.

In hostel bed maps, remove the dues lookup and the availability override that marks beds as available after proportional_end_date.

### UI: Action Buttons in Sheet

Add "Release Seat" and "Cancel Booking" in the action buttons grid (alongside Renew, Book Future, Transfer, Block) for each current booking. Each opens an AlertDialog:

- **Release Seat**: Warning text "This will terminate the booking and free the seat immediately. The student will no longer have access. This cannot be undone."
- **Cancel Booking**: Warning text "This will cancel the booking, free the seat, and cancel any pending dues. Transaction history will be preserved. This cannot be undone."

On confirmation, call the service method, close the sheet, and refresh seats.
