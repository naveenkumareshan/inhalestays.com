

# Fix: Seats Disappearing After Bookings

## Root Cause

The `getSeatsForDate` function in `vendorSeatsService.ts` uses `.in('seat_id', seatIds)` for the bookings and seat_block_history queries. The ISSM partner has **401 seats** in "Toppers reading room". With 401 UUIDs in the `.in()` clause, the resulting GET URL exceeds PostgREST's ~8KB URL limit, causing a network-level failure. Since the error occurs inside `Promise.all`, the entire function throws and returns `{ success: false }`. On the initial load, `seats` stays at `[]` (initial state). After a few successful operations or navigations, the issue compounds because every `fetchSeats()` call fails silently.

Additionally, `getVendorCabins` makes a network call via `supabase.auth.getUser()` which can fail during rapid operations (token refresh, rate limiting), causing cabins to fail to load and `fetchSeats` to early-return due to `cabins.length === 0`.

## Fix

### 1. Replace `.in('seat_id', seatIds)` with `.in('cabin_id', cabinIds)` for bookings (`vendorSeatsService.ts`)

The `bookings` table has a `cabin_id` column. Instead of filtering by 401 seat IDs, filter by 1-2 cabin IDs. This keeps the URL small regardless of seat count.

```typescript
// Before: .in('seat_id', seatIds) — 401 UUIDs = 15KB URL → FAIL
// After:  .in('cabin_id', cabinIds) — 1-2 UUIDs = tiny URL
```

Extract `cabinIds` from `seatsData` (unique `cabin_id` values) and use that for the bookings query.

### 2. Batch `.in('seat_id', ...)` for seat_block_history (`vendorSeatsService.ts`)

`seat_block_history` has no `cabin_id` column, so batch the seat IDs into chunks of 50, make parallel queries, and merge results.

### 3. Replace `getUser()` with `getSession()` in `getVendorCabins` (`vendorSeatsService.ts`)

`supabase.auth.getUser()` makes a network call that can fail. `supabase.auth.getSession()` reads from local storage — instant and reliable. Use `session.user` instead.

### 4. Refresh button also re-fetches cabins (`VendorSeats.tsx`)

Currently the refresh button only calls `fetchSeats()`, which early-returns if `cabins.length === 0`. If cabins failed to load, refresh never recovers. Fix: make the refresh button also re-fetch cabins if they're empty.

### 5. Add error handling for bookings/blocks sub-queries (`vendorSeatsService.ts`)

Currently `bookingsRes.error` and `blocksRes.error` are never checked. If they fail, `data` is null and silently becomes `[]`. Add explicit error logging so these failures are visible during debugging.

## Files Changed

- **`src/api/vendorSeatsService.ts`** — Use `cabin_id` for bookings filter; batch seat_block_history; replace `getUser()` with `getSession()`; add sub-query error handling
- **`src/pages/vendor/VendorSeats.tsx`** — Refresh button re-fetches cabins when empty

