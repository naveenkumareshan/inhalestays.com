

# Fix Manual Mess Booking Sheet — Reorder Flow, Fix Dues, Clean Up

## Current Issues
1. **Wrong order**: Currently Mess → Package → Duration → Student → Dates → Pricing → Notes → Proceed → (Confirm step with Payment/CollectedBy). User wants: Mess → Student → Duration Type & Dates → Package → Pricing & Discount → Final Price with Collecting Now & Due → Payment Mode → Collected By → Submit (all in one scroll, no separate confirm step).
2. **Due calculations wrong**: `dueAmount = totalAfterDiscount - advanceAmount` but `advanceAmount` starts equal to full price, not tracking properly when user changes "Collecting Now".
3. **Notes field**: Remove it.
4. **Booking summary name**: `selectedStudentName` includes `(email)` — should show just the name in summary.
5. **Collected By**: Should auto-fill with logged-in user's name, not be empty with placeholder.
6. **Two-step flow** (details → confirm): Merge into single scrolling step.

## Changes to `src/pages/admin/MessBookings.tsx`

### Reorder the Details Step sections:
1. **Select Mess** (pills) — same as now
2. **Student** (search + create) — move up, show after mess selected
3. **Duration** (type pills + count + start/end dates) — show after student selected
4. **Select Package** (pills) — show after duration set
5. **Pricing** section — show after package selected:
   - Package Price (read-only display), Discount input, Final Total display, Collecting Now input, Due Remaining display
6. **Payment Method** (`PaymentMethodSelector`) — inline, no separate confirm step
7. **Transaction ID + Proof** (if not cash) — inline
8. **Collected By** — default value set to `user?.name || ''` on sheet open
9. **Submit** button — single button, no Back/Confirm two-step

### Fix Due Calculation
- When package selected: `pricePaid = pkg.price * durationCount`, `advanceAmount = pricePaid` (full by default)
- `totalAfterDiscount = pricePaid - discountAmount`
- `dueAmount = totalAfterDiscount - advanceAmount`
- Ensure `advanceAmount` can't exceed `totalAfterDiscount`

### Remove
- `notes` state and textarea
- `bookingStep` state — no more 'details'/'confirm'/'success' steps, just 'form' and 'success'
- Separate confirm step JSX

### Fix Summary
- Store `selectedStudentNameOnly` (just name, no email) for display in summary
- Format end date properly with `fmtDate()`

### Collected By
- Set `collectedByName` to `user?.name || ''` in `resetBookingSheet`

## Files Modified
- `src/pages/admin/MessBookings.tsx` — single file, reorder JSX sections, merge confirm into form, fix dues, remove notes, fix name format, default collected by

