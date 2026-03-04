

# Performance Optimization & 5000-Student Scalability Plan

## Current Problems Identified

### 1. Critical: Full-table scans on every dashboard load
- **`getBookingStats`** (line 280): Fetches ALL bookings (`select('payment_status')`) just to count statuses — with 5000 students making multiple bookings, this will download tens of thousands of rows to the browser
- **`getRevenueByTransaction`** (line 296): Fetches ALL completed bookings to sum revenue client-side
- **`getActiveResidents`** (line 366): Two separate queries (bookings + cabins) on every dashboard load

### 2. Duplicate API calls
- The dashboard fires `getBookingStats`, `getRevenueByTransaction`, `getActiveResidents`, `getOccupancyReports`, `getTopFillingRooms`, and `getExpiringBookings` — all in parallel on mount. The `user_roles` query fires twice (visible in performance profile: two 1.2-1.6s fetches).

### 3. No database indexes
- Queries filter on `payment_status`, `start_date`, `end_date`, `user_id`, `cabin_id` — likely missing indexes on these columns.

### 4. Legacy axios code still present
- `axiosConfig.ts` and many service files (bookingManagementService, authService) still reference a non-existent Express backend (`localhost:5000`). These are dead code but add confusion and bundle weight.

## Solution: Server-Side Aggregation + Indexes

### Phase 1: Create database functions for aggregation (migration)

Create a single `get_dashboard_stats()` RPC that runs the counting/summing server-side and returns a small JSON object instead of thousands of rows:

```sql
-- Index for common booking queries
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_bookings_cabin_id ON bookings(cabin_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_hostel_bookings_status ON hostel_bookings(status);
CREATE INDEX IF NOT EXISTS idx_hostel_bookings_user_id ON hostel_bookings(user_id);

-- Dashboard stats RPC (replaces 4+ client-side full-table scans)
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_bookings', (SELECT count(*) FROM bookings),
    'completed_bookings', (SELECT count(*) FROM bookings WHERE payment_status = 'completed'),
    'pending_bookings', (SELECT count(*) FROM bookings WHERE payment_status = 'pending'),
    'cancelled_bookings', (SELECT count(*) FROM bookings WHERE payment_status = 'cancelled'),
    'total_revenue', (SELECT coalesce(sum(total_price), 0) FROM bookings WHERE payment_status = 'completed'),
    'active_residents', (SELECT count(*) FROM bookings WHERE payment_status = 'completed' AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE),
    'total_capacity', (SELECT coalesce(sum(capacity), 0) FROM cabins WHERE is_active = true)
  );
$$;
```

### Phase 2: Update dashboard service to use RPC

Rewrite `getBookingStats`, `getRevenueByTransaction`, and `getActiveResidents` in `adminBookingsService.ts` to call a single `supabase.rpc('get_dashboard_stats')` instead of 4 separate full-table queries.

### Phase 3: Fix duplicate user_roles query

In `AuthContext.tsx`, the `onAuthStateChange` callback and `getSession` both trigger `buildUser` → `fetchUserRole`, causing two identical network calls. Cache the result so it only fires once per session.

### Phase 4: Remove dead legacy code

Delete unused axios-based service files that reference the old Express backend:
- `src/api/axiosConfig.ts`
- `src/api/authService.ts`
- `src/api/bookingManagementService.ts`
- Any other files importing from `axiosConfig` that have Supabase equivalents

### Phase 5: Add pagination guardrails

For the admin students page with 5000 students — it already uses server-side pagination (good). Verify the `adminUsersService` uses `.range()` and `{ count: 'exact' }` patterns consistently.

## Scalability Assessment

**Can it handle 5000 students?** Yes, with these changes:
- Database indexes ensure queries stay fast as data grows
- Server-side aggregation (RPC) eliminates the bottleneck of downloading thousands of rows
- Existing pagination in admin lists is already correct
- Supabase can comfortably handle this scale

## Files Changed
- **Migration SQL**: Add indexes + `get_dashboard_stats()` RPC
- **`src/api/adminBookingsService.ts`**: Replace full-table scan methods with single RPC call
- **`src/hooks/use-dashboard-statistics.ts`**: Simplify to use single RPC
- **`src/contexts/AuthContext.tsx`**: Prevent duplicate `fetchUserRole` calls
- **Delete**: `src/api/axiosConfig.ts`, `src/api/authService.ts`, `src/api/bookingManagementService.ts`

