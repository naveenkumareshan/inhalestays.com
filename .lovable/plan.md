

# Fix: Search Not Working on Bookings Pages

## Issues Found

### Issue 1: Reading Room Bookings Search (AdminBookingsList)
In `src/api/adminBookingsService.ts` line 34, search only filters by `serial_number`:
```typescript
query = query.or(`serial_number.ilike.%${filters.search}%`);
```
Searching by student name, email, or phone does nothing. Supabase `.or()` cannot filter across joined tables directly. The fix is to first query `profiles` for matching user IDs, then add those IDs to the filter.

### Issue 2: Hostel Bookings Search (HostelBookingsList)
In `src/components/admin/HostelBookingsList.tsx` line 72-76, the client-side filter references wrong field names:
- `booking.student?.name` — data uses `booking.profiles?.name`
- `booking._id` — data uses `booking.id`

The search silently matches nothing because `booking.student` is always `undefined`.

## Fix Plan

### Change 1: `src/api/adminBookingsService.ts` — Expand search to include user name/phone
Before the main query, if `filters.search` is set, do a quick lookup on `profiles` to find matching `user_id`s, then combine `serial_number.ilike` OR `user_id.in.(matchedIds)` in the `.or()` clause.

### Change 2: `src/components/admin/HostelBookingsList.tsx` — Fix field references
Update `getFilteredBookings()`:
- `booking.student?.name` → `booking.profiles?.name`
- `booking.student?.email` → `booking.profiles?.email`
- `booking._id` → `booking.id`

### Files Changed
- `src/api/adminBookingsService.ts` — search with profile name/phone/email lookup
- `src/components/admin/HostelBookingsList.tsx` — fix field name references in client-side filter

