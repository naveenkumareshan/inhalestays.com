

# Fix: Seat/Bed Validity Should Always Equal Booking End Date

## Problem

Per your existing rule: seats/beds remain valid for the **entire booked period** regardless of payment status. But the code currently recalculates `proportional_end_date` proportionally based on how much has been paid — showing wrong, shorter validity dates.

Three places calculate this incorrectly:

1. **Reading Room due creation** (`VendorSeats.tsx` line 529): Sets `proportionalEndDate = dueDate` (the advance validity date, not booking end date)
2. **Reading Room due collection** (`vendorSeatsService.ts` lines 806-815): Recalculates validity as `(totalPaid / totalFee) * totalDays` — shrinking validity based on payment ratio
3. **Hostel due collection** (`HostelDueManagement.tsx` lines 199-213): Same proportional recalculation bug

## Fix

Set `proportional_end_date` to the booking's `end_date` in all three locations. The field still exists for manual override by partners, but automatic calculation should always default to the full booking period.

### Changes

| File | What Changes |
|------|-------------|
| `src/pages/vendor/VendorSeats.tsx` ~line 529 | Set `proportionalEndDate = computedEndDate` (booking end date) instead of `dueDate` |
| `src/api/vendorSeatsService.ts` ~lines 804-815 | In `collectDuePayment`, always set `proportionalEndDate = booking.end_date` instead of proportional calculation |
| `src/pages/admin/HostelDueManagement.tsx` ~lines 199-213 | In `handleCollect`, always set `proportionalEndDate = booking.end_date` instead of proportional calculation |
| `src/pages/admin/HostelBedMap.tsx` ~line 714 | Set `proportional_end_date` to booking `end_date` instead of `advanceComputed.proportionalEndDate` |

The manual edit capability (pencil icon) for validity dates remains unchanged — partners can still override if needed.

