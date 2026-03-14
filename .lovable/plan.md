

# Fix Payment Method Labels & Standardize Location Display

## Problem 1: Payment Method Showing Raw Values
Several pages display raw `payment_method` values (e.g., `custom_abc-uuid`) instead of resolved human-readable labels like "Cash Counter 1" or "SBI UPI". Pages that already work correctly (DueManagement, Receipts, HostelReceipts) use `resolvePaymentMethodLabels` + `getMethodLabel` from `src/utils/paymentMethodLabels.ts`. The fix is to apply the same pattern everywhere else.

## Problem 2: Missing Floor/Room in Location Display
Hostel bookings show "Hostel / Bed #X" without Room number. Reading Room bookings sometimes miss Floor number. This needs standardization across all views.

---

## Files to Change

### 1. `src/components/admin/operations/CheckInViewDetailsDialog.tsx`
- Import `resolvePaymentMethodLabels, getMethodLabel` from paymentMethodLabels utility
- Add state + useEffect to resolve custom labels from `booking.payment_method`
- Replace raw `booking.payment_method` (line 88) with resolved label
- For hostel: add Room number display (booking needs `hostel_rooms` data — already passed from parent)
- Update hostel line (69) to: `Hostel / Room X · Bed #Y`

### 2. `src/components/admin/operations/CheckInFinancials.tsx` (ReceiptsDialog)
- Import `resolvePaymentMethodLabels, getMethodLabel`
- After fetching receipts, resolve custom method labels
- Replace raw `r.payment_method` (line 291) with `getMethodLabel(r.payment_method, customLabels)`

### 3. `src/components/admin/operations/CheckInTracker.tsx`
- Hostel column (line 286): Add room number — data is already fetched (`hostel_rooms:room_id(room_number)`)
- Change display to: `Hostel / Room X · Bed #Y`

### 4. `src/components/admin/operations/ReportedTodaySection.tsx`
- Update hostel query (line 40) to include `hostel_rooms:room_id(room_number)` (currently missing)
- Update hostel display (line 141) to: `Hostel / Room X · Bed #Y`

### 5. `src/pages/AdminBookingDetail.tsx`
- Import `resolvePaymentMethodLabels, getMethodLabel`
- After fetching receipts, resolve custom labels for all `payment_method` values (including `advancePaymentMethod`)
- Replace raw `r.payment_method` in receipts table (line 534) with resolved label
- Update `getSeatLabel()` for reading room (line 157): include floor if available from booking data
- Invoice download: pass resolved payment method label instead of raw value

### 6. `src/pages/Confirmation.tsx`
- Import `getMethodLabel` from paymentMethodLabels
- Replace raw `booking.payment_method` (line 134) with `getMethodLabel(booking.payment_method)`

### 7. `src/pages/students/StudentBookingView.tsx`
- Update reading room query (line 199): add `floor` to seats select → `seats:seat_id(price, number, category, floor)`
- Import `resolvePaymentMethodLabels, getMethodLabel`
- After fetching receipts, resolve custom labels
- Replace raw `r.payment_method` (line 553) with resolved label
- Add Floor info display in Booking Info section for reading rooms
- Add Room number display for hostel (already fetched via `hostel_rooms(room_number)`)

### 8. `src/utils/invoiceGenerator.ts`
- Update `InvoiceData` interface: add optional `floor` and `roomNumber` fields
- Update `paymentMethodLabel` function to handle `custom_*` values via a new optional `customLabel` param on `InvoiceData`
- Add `paymentMethodDisplayLabel` field to `InvoiceData` so callers pass the pre-resolved label
- Update invoice HTML to show Floor + Room/Flat when available

### 9. `src/pages/admin/Reconciliation.tsx`
- Already resolves custom labels ✓ but doesn't use them in mobile cards (line 540) and desktop table (line 605) — both show `r.payment_method` which is already resolved at mapping time ✓ — no change needed

---

## Pattern Applied Everywhere
```typescript
// Import
import { resolvePaymentMethodLabels, getMethodLabel } from '@/utils/paymentMethodLabels';

// State
const [customLabels, setCustomLabels] = useState<Record<string, string>>({});

// After fetching data with payment_method fields
const methods = data.map(r => r.payment_method);
const labels = await resolvePaymentMethodLabels(methods);
setCustomLabels(labels);

// Display
{getMethodLabel(r.payment_method, customLabels)}
```

## Location Display Standard
- **Reading Room**: `{CabinName} / Floor {X} · Seat #{Y}`
- **Hostel**: `{HostelName} / Room {X} · Bed #{Y}`
- **Invoice**: `{PropertyName} — Floor {X} · Seat/Bed #{Y}` or `{PropertyName} — Room {X} · Bed #{Y}`

