

# Fix: Scope "Top Filling Reading Rooms" to Partner's Own Properties

## Problem
`getTopFillingRooms()` in `adminBookingsService.ts` queries ALL active cabins without filtering by ownership. Partners and employees see every reading room across the platform.

## Solution
Pass the user's role context into `getTopFillingRooms` and filter cabins by `created_by` for non-admin users, using the same `getEffectiveOwnerId` pattern used elsewhere.

## Changes

### 1. `src/api/adminBookingsService.ts` — `getTopFillingRooms`
- Accept optional `partnerUserId?: string` parameter
- When provided, add `.eq('created_by', partnerUserId)` to the cabins query (line 506-508)

### 2. `src/components/admin/DashboardStatistics.tsx`
- Import `useAuth` to get current user
- Determine `partnerUserId` (same pattern as `DynamicStatisticsCards`: if role is `vendor`, pass `user.id`)
- For `vendor_employee`, use `getEffectiveOwnerId` to resolve the partner's ID
- Pass `partnerUserId` to `getTopFillingRooms()`

### 3. `src/components/admin/OccupancyChart.tsx` and `src/components/admin/RevenueChart.tsx`
- Verify these charts also scope data to the partner. If `getMonthlyRevenue` or `getOccupancyTrend` lack partner filtering, apply the same fix.

