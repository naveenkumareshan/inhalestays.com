

# Plan: Restructure Mess Sidebar to Match Reading Room/Hostel Pattern

## Problem
Currently "Mess / Food" is a single sidebar link. Reading Rooms and Hostels use expandable collapsible sections with sub-items (Seat Map, Bookings, Receipts, etc.). Mess should follow the same pattern, with sub-items and a detailed daily attendance/meal count dashboard.

## Approach
Use URL query params (`?tab=`) to link sidebar sub-items to specific tabs within the existing `MessManagement.tsx` — same pattern as the Reports page which uses `?tab=revenue`, `?tab=transactions`, etc.

## Changes

### 1. `src/components/admin/AdminSidebar.tsx`
Convert the single "Mess / Food" link (lines 282-290) into an expandable section with sub-items:

| Sub-item | URL | Tab |
|----------|-----|-----|
| Mess Profile | `{prefix}/mess?tab=profile` | profile |
| Meal Packages | `{prefix}/mess?tab=packages` | packages |
| Timings & Menu | `{prefix}/mess?tab=menu` | menu |
| Subscriptions | `{prefix}/mess?tab=subscriptions` | subscriptions |
| Attendance | `{prefix}/mess?tab=attendance` | attendance |
| Revenue | `{prefix}/mess?tab=revenue` | revenue |
| Reviews | `/admin/reviews?module=Mess` | (admin only) |

For admin-only items like "Manage Mess Partners", show only for admin role (same pattern as "Manage Rooms" / "Manage Hostels").

### 2. `src/pages/admin/MessManagement.tsx`
- Read `tab` from URL search params (`useSearchParams`) and sync with active tab state (same as `BookingReportsPage.tsx` pattern)
- Add a **daily meal dashboard card** at the top of the Attendance tab showing:
  - Today's date with day name
  - Per-meal cards: Expected count, Consumed count, Remaining count
  - Total students expected today
- Add compact stats bar at the top (like VendorStatsCards pattern): Active Subs | Today's Attendance | Packages | Revenue

### 3. Files Modified
| File | Change |
|------|--------|
| `src/components/admin/AdminSidebar.tsx` | Convert Mess from single link to collapsible with sub-items |
| `src/pages/admin/MessManagement.tsx` | Add `useSearchParams` for tab sync + enhanced attendance dashboard with daily meal counts |

