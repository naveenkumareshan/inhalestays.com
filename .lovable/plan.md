

# Fix: Partner-wise Data Isolation for Seats and Beds

## Problem
When a partner selects "All" in the cabin/hostel dropdown:
1. **Seat Map** (`VendorSeats`): `vendorSeatsService.getSeatsForDate('all', date)` fetches ALL seats from ALL cabins because the `seats` table RLS policy is `Anyone can view seats → true`. No ownership filter is applied.
2. **Bed Map** (`HostelBedMap`): The beds query fetches ALL beds when `selectedHostelId === 'all'` without restricting to the partner's hostel IDs. The hostel dropdown is correctly filtered, but the beds query is not.

## Root Cause
- RLS on `seats` and `hostel_beds` is intentionally open (students need to see them for booking). Partner isolation must be enforced at the application/query level.
- `getSeatsForDate` does not accept a list of partner cabin IDs to filter when `cabinId === 'all'`.

## Solution

### 1. Fix `vendorSeatsService.getSeatsForDate` — filter by partner cabins
When `cabinId === 'all'`, first fetch the partner's cabin IDs (using `created_by` filter), then filter seats to only those cabins using `.in('cabin_id', partnerCabinIds)`.

**File**: `src/api/vendorSeatsService.ts`
- Add a `partnerCabinIds` parameter or do an internal lookup of the authenticated user's cabins
- When `cabinId === 'all'`, query cabins with `created_by = auth.uid()` first, then filter seats by those IDs

### 2. Fix `HostelBedMap` beds query — filter by partner hostels
When `selectedHostelId === 'all'` and user is not admin, restrict the beds query to only the partner's hostel IDs (already loaded in the `hostels` state).

**File**: `src/pages/admin/HostelBedMap.tsx`
- In the `fetchBeds` callback (~line 196-205): when `selectedHostelId === 'all'` and user is not admin, add `.in('hostel_rooms.hostel_id', hostels.map(h => h.id))` to filter beds to only partner-owned hostels

### 3. Fix `VendorSeats` — pass partner cabin IDs
Pass the loaded `cabins` IDs to `getSeatsForDate` so it can filter properly.

**File**: `src/pages/vendor/VendorSeats.tsx`
- Pass `cabins.map(c => c._id)` to the service when selecting "all"

## Files Changed
- `src/api/vendorSeatsService.ts` — add partner cabin filtering in `getSeatsForDate`
- `src/pages/vendor/VendorSeats.tsx` — pass cabin IDs to service
- `src/pages/admin/HostelBedMap.tsx` — filter beds by partner hostel IDs when "all" selected

