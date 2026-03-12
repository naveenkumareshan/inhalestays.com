

# Add "Entered By" (Employee Name) to All Booking Lists

## Problem
Bookings made by employees don't show who entered them. Both `bookings` and `hostel_bookings` tables already have `collected_by_name` columns that store the employee name when a booking is created by an employee.

## Changes

### 1. `src/pages/AdminBookings.tsx` — Reading Room Bookings
- The service already returns `collected_by_name` from the bookings table (it uses `select('*', ...)`)
- Add "Entered By" display below "Booked On" in both desktop table and mobile card views
- Show `b.collected_by_name` if present, otherwise nothing

**Desktop table** (line ~214, after the Booked On cell content):
```
{fmtDateTime(b.createdAt)}
{b.collected_by_name && <div className="text-[10px] text-muted-foreground">By: {b.collected_by_name}</div>}
```

**Mobile card** (line ~130, after Booked span):
```
{b.collected_by_name && <div><span className="text-muted-foreground">By: </span>{b.collected_by_name}</div>}
```

### 2. `src/api/adminBookingsService.ts` — Reading Room Service
- Add `collected_by_name` to the mapped output (line ~120-152 mapping block)
- Add: `collected_by_name: b.collected_by_name || '',`

### 3. `src/pages/hotelManager/AdminHostelBookings.tsx` — Hostel Bookings
- The query already uses `select('*', ...)` so `collected_by_name` is already fetched
- Add "Entered By" display below "Booked On" cell (line ~210):
```
{fmtDateTime(b.created_at)}
{b.collected_by_name && <div className="text-[10px] text-muted-foreground">By: {b.collected_by_name}</div>}
```

### 4. `src/components/admin/AdminBookingsList.tsx` — Legacy/Alternative Bookings List
- Add `collected_by_name` display below "Booked On" column (line ~291, after the `formatDate` for `createdAt`)
- This component uses the same service, so the data will already be available

**4 files, small display-only additions. No database changes needed.**

