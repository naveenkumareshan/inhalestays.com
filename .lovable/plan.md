
# Show "Fully Paid" Badge on Booking Cards

## What's Changing

On the student bookings list (`BookingsList.tsx`), when a booking has `paymentStatus` of `completed` (or `advance_paid`) and the due amount is zero, display a green "Fully Paid" badge instead of showing nothing. The existing orange/red "Due: ₹X" badge continues to appear when there is an outstanding balance.

## Change

**File**: `src/components/booking/BookingsList.tsx` (lines 196-198)

Current logic only shows a badge when there's a due:
```tsx
{(booking.dueAmount ?? 0) > 0 && (
  <Badge ...>Due: ₹{booking.dueAmount}</Badge>
)}
```

Updated logic adds a "Fully Paid" badge for the zero-due case:
```tsx
{(booking.dueAmount ?? 0) > 0 ? (
  <Badge className="border-red-500 text-red-600 ...">Due: ₹{booking.dueAmount}</Badge>
) : booking.paymentStatus === 'completed' ? (
  <Badge className="bg-green-100 text-green-700 ...">Fully Paid</Badge>
) : null}
```

This applies to both hostel and reading room bookings since they share the same `BookingsList` component. Single-file change only.
