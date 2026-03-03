

# Clean URLs: Replace UUIDs with Serial Numbers in Booking Pages

## Problem
Booking URLs show raw UUIDs like `/student/bookings/e506380e-ad1e-467f-abdb-5ac6c5a4e39a`, which look unprofessional and confusing to users. This affects student, partner, and admin booking pages.

## Solution
Replace UUID-based booking URLs with human-readable serial numbers (e.g., `/student/bookings/IS-BOOK-2026-00015`), following the same dual-lookup pattern already used for Reading Rooms and Hostels.

## What Changes

### 1. Student Booking View (`src/pages/students/StudentBookingView.tsx`)
- Update the `fetchData` function to first try looking up by `serial_number`, and if not found, fall back to `id` (UUID) for backward compatibility
- The `bookingId` param will now accept either format

### 2. Admin Booking Detail (`src/pages/AdminBookingDetail.tsx`)
- Same dual-lookup: try `serial_number` first, then fall back to `id`
- Works for both cabin and hostel booking types

### 3. Update all navigation links to use serial numbers
Replace `booking.id` with `booking.serial_number` in navigation calls across these files:

| File | What navigates |
|------|---------------|
| `src/components/booking/BookingsList.tsx` | "View Details" link on student booking cards |
| `src/pages/StudentBookings.tsx` | Due payment card click |
| `src/pages/StudentDashboard.tsx` | Booking card click |
| `src/components/profile/ProfileManagement.tsx` | Profile booking list links |
| `src/pages/AdminBookings.tsx` | Admin booking list "View" buttons |
| `src/pages/hotelManager/AdminHostelBookings.tsx` | Hostel booking "View" buttons |
| `src/components/admin/DashboardExpiringBookings.tsx` | Expiring booking click |
| `src/components/admin/reports/ExpiringBookings.tsx` | Renew booking link |
| `src/components/admin/reports/BookingTransactions.tsx` | Transaction view link |
| `src/components/admin/AdminBookingsList.tsx` | Admin bookings list |
| `src/components/admin/SeatTransferManagementHistory.tsx` | Transfer history view |

### 4. Booking Transactions page (`src/pages/students/BookingTransactions.tsx`)
- Update to use serial_number in URL and resolve to UUID internally for data queries

## Technical Details

### Dual-Lookup Pattern (same as cabins/hostels)
```text
In StudentBookingView and AdminBookingDetail:
  1. Try: supabase.from('bookings').select(...).eq('serial_number', bookingId).single()
  2. If not found: supabase.from('bookings').select(...).eq('id', bookingId).single()
  
This ensures old UUID links still work while new links use serial numbers.
```

### Navigation Links Update Pattern
```text
Before: navigate(`/student/bookings/${booking.id}`)
After:  navigate(`/student/bookings/${booking.serial_number || booking.id}`)

Before: navigate(`/admin/bookings/${booking.id}/cabin`)
After:  navigate(`/admin/bookings/${booking.serial_number || booking.id}/cabin`)
```

The `|| booking.id` fallback ensures links work even if a booking somehow lacks a serial number.

### Routes Stay the Same
No route changes needed in `App.tsx` -- the `:bookingId` param already accepts any string.

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/students/StudentBookingView.tsx` | Dual-lookup by serial_number then UUID |
| `src/pages/AdminBookingDetail.tsx` | Dual-lookup by serial_number then UUID |
| `src/pages/students/BookingTransactions.tsx` | Resolve serial_number to UUID for queries |
| `src/components/booking/BookingsList.tsx` | Use serial_number in nav links |
| `src/pages/StudentBookings.tsx` | Use serial_number in nav links |
| `src/pages/StudentDashboard.tsx` | Use serial_number in nav links |
| `src/components/profile/ProfileManagement.tsx` | Use serial_number in nav links |
| `src/pages/AdminBookings.tsx` | Use serial_number in nav links |
| `src/pages/hotelManager/AdminHostelBookings.tsx` | Use serial_number in nav links |
| `src/components/admin/DashboardExpiringBookings.tsx` | Use serial_number in nav links |
| `src/components/admin/reports/ExpiringBookings.tsx` | Use serial_number in nav links |
| `src/components/admin/reports/BookingTransactions.tsx` | Use serial_number in nav links |
| `src/components/admin/AdminBookingsList.tsx` | Use serial_number in nav links |
| `src/components/admin/SeatTransferManagementHistory.tsx` | Use serial_number in nav links |

