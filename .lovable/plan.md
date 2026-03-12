

# Reading Room Bookings — Partner/Employee Scoping Bug

## Problem
The `AdminBookings.tsx` page calls `adminBookingsService.getAllBookings(filters)` **without** the `partnerUserId` parameter. The service supports partner scoping (filtering bookings by cabins owned by the partner), but it is never invoked for partners or their employees on this page.

This means partners and employees either see **all bookings** (if RLS is permissive) or see data inconsistently compared to other pages like BookingTransactions which correctly pass `partnerUserId`.

## Fix

### `src/pages/AdminBookings.tsx`
1. Import `useAuth` and `getEffectiveOwnerId`
2. Add state for `partnerUserId` and resolve it on mount (same pattern used in `BookingCalendarPage.tsx` and `ExpiringBookingsPage.tsx`)
3. Pass `partnerUserId` as the second argument to `getAllBookings(filters, partnerUserId)`

```typescript
const { user } = useAuth();
const isPartner = user?.role === 'vendor' || user?.role === 'vendor_employee';
const [partnerUserId, setPartnerUserId] = useState<string | undefined>();

useEffect(() => {
  if (isPartner) {
    getEffectiveOwnerId().then(({ ownerId }) => setPartnerUserId(ownerId));
  }
}, [isPartner]);

// In fetchBookings:
const response = await adminBookingsService.getAllBookings(filters, partnerUserId);
```

This is a small, targeted fix — one file, same pattern already used elsewhere in the codebase.

