

# Expiring Bookings Pages — Match Standard UI Format

## Problem
Both `ExpiringBookingsPage` and `HostelExpiringBookingsPage` use a basic Card+Table layout that doesn't match the standard booking list format used in `AdminBookingsList` (compact filter row, serial numbers, pagination, proper column structure).

## Changes

### Both `ExpiringBookingsPage.tsx` and `HostelExpiringBookingsPage.tsx`

Rewrite to match the `AdminBookingsList` UI pattern:

1. **Compact filter row** at top — search input (h-8, w-48), days threshold select, sort order, Clear button, CSV export button — all inline in a flex-wrap row
2. **Serial number column** using `getSerialNumber(idx, currentPage, itemsPerPage)` from `AdminTablePagination`
3. **Standard table columns**:
   - Reading Room: S.No. | Booking ID | Customer (name + email + phone stacked) | Room / Seat (cabin name + seat number) | Start Date | End Date | Expires In (badge + date) | Actions (Eye + Details button)
   - Hostel: S.No. | Booking ID | Customer | Hostel / Room / Bed | Start Date | End Date | Expires In | Actions
4. **Pagination** using `AdminTablePagination` component (client-side pagination since data is already fetched)
5. **Loading skeleton** matching the `AdminBookingsList` skeleton pattern
6. **Proper route prefix** — use `location.pathname` to determine `/admin` vs `/partner` for the View button navigation
7. **Table header style** — match `bg-muted/30` row, `text-xs font-medium uppercase tracking-wider` headers

### Files Modified
- `src/pages/admin/ExpiringBookingsPage.tsx` — full rewrite
- `src/pages/admin/HostelExpiringBookingsPage.tsx` — full rewrite

