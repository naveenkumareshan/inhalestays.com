

# Fix Partner Data Isolation: Show Only Linked Properties

## Problem
Partners (vendors) can see ALL active/approved Reading Rooms and Hostels instead of only the properties they own. This happens because:
- RLS has "Anyone can view active approved cabins/hostels" policies (needed for student-facing pages)
- Partner-facing pages don't always filter by `created_by` in their queries

## Affected Pages and Fixes

### 1. Seat Control Center (VendorSeats) and Due Management
**File**: `src/api/vendorSeatsService.ts` -- `getVendorCabins()`

Currently queries `cabins` with no ownership filter. Fix: add `.eq('created_by', user.id)` for non-admin users.

- Get current user via `supabase.auth.getUser()`
- Check role from `user_roles` table
- If not admin, add `.eq('created_by', userId)` filter to cabins query

### 2. Hostel Bed Map
**File**: `src/pages/admin/HostelBedMap.tsx` (line ~168)

Currently queries `hostels` with only `is_active = true`. Fix: for non-admin users, add `.eq('created_by', userId)`.

- Use `useAuth()` hook (already imported) to check `user.role`
- If role is not `admin`, add created_by filter to the hostels fetch query

### 3. Hostel Due Management
**File**: `src/pages/admin/HostelDueManagement.tsx` (line ~61)

Currently queries `hostels` with `is_active = true`. Fix: same pattern -- add `created_by` filter for non-admin.

### 4. Hostel Receipts
**File**: `src/pages/admin/HostelReceipts.tsx` (line ~58)

Currently queries `hostels` with no filter. Fix: add `created_by` filter for non-admin.

### 5. Hostel Deposits
**File**: `src/pages/admin/HostelDeposits.tsx`

The hostel bookings queries here rely on RLS for `hostel_bookings`, which does have proper partner filtering ("Partners can view bookings for own hostels"). However, any hostel dropdown/filter lists need the `created_by` filter.

### 6. Partner Cabin Management (CabinManagement.tsx + CabinsDashboard.tsx)
**File**: `src/api/hostelManagerService.ts`

Currently uses axios to call a non-existent external API `/manager/cabins/managed`. Fix: replace with direct Supabase query filtered by `created_by`.

- Rewrite `getManagedCabins()` to use `supabase.from('cabins').select('*').eq('created_by', userId)`
- Remove the broken axios calls for the other stats methods or convert them similarly

## Implementation Pattern

Every affected query will follow this pattern:

```text
1. Get current user (from useAuth hook or supabase.auth.getUser())
2. Check if user.role === 'admin'
3. If admin: no filter (see all)
4. If partner/vendor: add .eq('created_by', userId)
```

## Files to Modify

| File | Change |
|------|--------|
| `src/api/vendorSeatsService.ts` | Add `created_by` filter to `getVendorCabins()` for non-admin users |
| `src/pages/admin/HostelBedMap.tsx` | Add `created_by` filter to hostels query for non-admin |
| `src/pages/admin/HostelDueManagement.tsx` | Add `created_by` filter to hostels query for non-admin |
| `src/pages/admin/HostelReceipts.tsx` | Add `created_by` filter to hostels query for non-admin |
| `src/pages/admin/HostelDeposits.tsx` | Add `created_by` filter to hostel bookings queries for non-admin |
| `src/api/hostelManagerService.ts` | Replace broken axios calls with Supabase queries filtered by `created_by` |

## Technical Notes

- The `user.role` is available from `useAuth()` context in page components
- For service files, we use `supabase.auth.getUser()` and check `user_roles` table
- RLS policies for `hostel_bookings`, `hostel_dues`, `hostel_receipts` already have partner-specific policies that filter correctly -- the issue is primarily with the **hostel/cabin dropdown lists** and **direct property queries** that hit the public SELECT policy
- No database or RLS changes needed -- this is purely a code-level filtering fix

