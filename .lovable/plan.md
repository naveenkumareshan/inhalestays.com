

# Fix: Partner Dashboard Data Isolation + Coupon Visibility

## Issue 1: Partner Dashboard Shows All Data

The `/partner/dashboard` route renders `AdminDashboard` which calls `get_dashboard_stats` RPC — this returns **global** statistics (all bookings, all revenue). Partners see the same numbers as admins.

**Fix:** Update `DynamicStatisticsCards` and `DashboardStatistics` to pass a partner context. When the logged-in user is a vendor, filter dashboard queries to only include their own cabins/hostels.

### Changes:

**`src/hooks/use-dashboard-statistics.ts`**
- Accept an optional `partnerId` parameter
- When `partnerId` is provided, call a new RPC `get_partner_dashboard_stats(partner_user_id)` instead of `get_dashboard_stats()`

**Database migration — create `get_partner_dashboard_stats` RPC:**
- A new `SECURITY DEFINER` function that computes the same stats as `get_dashboard_stats` but filtered to cabins where `created_by = partner_user_id` and hostels where `created_by = partner_user_id`

**`src/components/admin/DynamicStatisticsCards.tsx`**
- Read `user` from `useAuth()`, pass `user.id` when role is `vendor`

**`src/components/admin/DashboardStatistics.tsx`**
- Same — pass user context so `getTopFillingRooms` is filtered to partner-owned cabins only
- Update `adminBookingsService.getTopFillingRooms()` to accept an optional `userId` filter

**`src/components/admin/OccupancyChart.tsx` and `RevenueChart.tsx`**
- Filter chart data to partner-owned properties when user is a vendor

## Issue 2: Partners See Admin-Created and Other Partners' Coupons

Currently, the RLS policy "Partners can view relevant coupons" allows vendors to see all `scope='global'` coupons. The user wants partners to see **only their own** coupons.

**Fix — update coupon filtering in `CouponManagement.tsx`:**
- When the user role is `vendor`, add a client-side filter or modify `couponService.getCoupons()` to pass a `created_by` / `partner_id` filter
- In `fetchCoupons`, when user is a vendor, fetch only coupons where `created_by = user.id` (their own coupons)

**`src/api/couponService.ts` — `getCoupons` method:**
- Add a `createdBy` filter parameter
- When provided, add `.eq('created_by', createdBy)` to the query

**`src/components/admin/CouponManagement.tsx`:**
- Pass `createdBy: user.id` when user role is `vendor`

This is purely a client-side query filter since RLS already prevents write access. Partners will only see coupons they created themselves.

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/use-dashboard-statistics.ts` | Add partner filtering support |
| `src/components/admin/DynamicStatisticsCards.tsx` | Pass partner context |
| `src/components/admin/DashboardStatistics.tsx` | Pass partner context for top rooms |
| `src/api/adminBookingsService.ts` | Add partner-filtered variants |
| `src/api/couponService.ts` | Add `createdBy` filter to `getCoupons` |
| `src/components/admin/CouponManagement.tsx` | Filter coupons by creator for vendors |
| Database migration | Create `get_partner_dashboard_stats` RPC |

