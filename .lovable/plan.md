

# Add "Future Booked" Status Color for Beds with Upcoming Bookings

## Problem
Beds with future bookings (booking starts after the selected date) show as green "Available" because the current logic only checks if a booking overlaps the selected date. A bed like Flat 103, Bed 1 (booked from March 13) shows green today (March 5).

## Solution
Add a new `'future_booked'` status with a **purple/violet** color to distinguish beds that are currently unoccupied but have a confirmed future booking.

## Changes in `src/pages/admin/HostelBedMap.tsx`

### 1. Update types (lines 35, 54)
Add `'future_booked'` to `StatusFilter` and `HostelBed.dateStatus`:
```
type StatusFilter = 'all' | 'available' | 'booked' | 'expiring_soon' | 'blocked' | 'future_booked';
dateStatus: 'available' | 'booked' | 'expiring_soon' | 'blocked' | 'future_booked';
```

### 2. Update status determination logic (lines 283-291)
After checking `currentBooking`, add: if no current booking but `allBeds` has future bookings or `is_available === false`, set `dateStatus = 'future_booked'`.

### 3. Add purple/violet colors to status helpers (lines 872-900)
- `statusColors`: `'future_booked'` → `'bg-violet-100 border-violet-500 dark:bg-violet-900 dark:border-violet-600'`
- `statusLabel`: `'future_booked'` → `'Future Booked'`
- `statusIcon`: `'future_booked'` → `<Clock className="h-3 w-3 text-violet-600" />` (Clock icon)

### 4. Update stats (lines 413-426)
Add `futureBooked` count to stats object.

### 5. Update legend (lines 1031-1038)
Add purple legend entry for "Future Booked".

### 6. Update status filter dropdown
Add `'future_booked'` option to the Select component.

### 7. Update sheet/detail panel logic
Treat `'future_booked'` similarly to `'available'` for booking form visibility (can still book future dates), but show info about the upcoming booking.

## Also update the student-facing bed map

### `src/components/hostels/HostelBedMap.tsx`
The student bed map legend and status logic also need the same purple color for future-booked beds. Update the `is_available` check to consider `occupantName` presence for future bookings and add legend entry.

### Files Changed
- `src/pages/admin/HostelBedMap.tsx` — New `future_booked` status throughout
- `src/components/hostels/HostelBedMap.tsx` — Student-facing legend and color update

