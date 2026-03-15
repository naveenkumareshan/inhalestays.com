

## Phase 1: Student Bookings Filter Buttons + Laundry Orders

### What Changes

**`src/pages/StudentBookings.tsx`**

1. **Replace the 3 navigation buttons** (Reading Room, Hostel, Mess) with 5 **filter pill buttons**: `All`, `Reading Room`, `Hostel`, `Mess`, `Laundry`. These filter the booking list — not navigate away.

2. **Add laundry order fetching** — fetch `laundry_orders` with `laundry_order_items` and `laundry_partners` joins for the current user, map them to the same `Booking` shape with `bookingType: 'laundry'`.

3. **Add filter state** — `typeFilter: 'all' | 'cabin' | 'hostel' | 'mess' | 'laundry'`. When a filter is selected, both `currentBookings` and `pastBookings` are filtered by `bookingType` before passing to `BookingsList`.

4. **Laundry booking mapping** — Each laundry order maps to the standard booking card format:
   - `bookingId` = serial_number
   - `itemName` = partner business_name or "Laundry"
   - `totalPrice` = total_amount
   - `startDate` / `endDate` = pickup_date
   - `status` / `paymentStatus` from order status
   - `bookingType` = 'laundry'

5. **Keep Active/Expired tabs** — Laundry orders in active: status not in `['delivered', 'cancelled']`; expired: `delivered` or `cancelled`.

### UI Layout

```text
┌─────────────────────────────────────┐
│  [All] [Reading Room] [Hostel]      │
│  [Mess] [Laundry]                   │
├─────────────────────────────────────┤
│  My Bookings                        │
│  [Active]  [Expired]                │
│  ... filtered booking cards ...     │
└─────────────────────────────────────┘
```

Filter buttons use the same pill/chip style (horizontally scrollable), with the active filter highlighted in `bg-primary text-white` and inactive in `bg-card border`.

### Files to Modify
- `src/pages/StudentBookings.tsx` — filter state, laundry fetch, filter UI, filtered list passing

