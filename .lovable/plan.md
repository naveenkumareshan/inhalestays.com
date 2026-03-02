

# Remove Confusing "Both" Stay Type Badge

## Problem
The purple "Both" badge (showing stay type) appears on all hostel detail pages since most hostels default to "Both" for stay type. This is confusing for students as it doesn't convey useful information.

## Solution
Remove the stay type badge from the hostel details page entirely. The stay type info is still available in admin views and doesn't add value for students.

## Changes

| File | Change |
|------|--------|
| `src/pages/HostelRoomDetails.tsx` | Remove the purple stay type badge (lines ~518-521) and the `stayTypeLabel` variable (line ~384). Also remove the `Building` icon import if no longer used. |

This is a simple UI cleanup -- no database or logic changes needed.

