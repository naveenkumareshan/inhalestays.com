

# Add Property Count Summary + Use Shared Pagination on All Management Pages

## Problem
1. No total count displayed at the top — admin can't see at a glance how many reading rooms/hostels/mess services exist
2. Pagination formatting is inconsistent across the three pages

## Changes

### 1. Add Count Badge to Page Headers
Show a count badge next to the title on all three management pages:

- **RoomManagement**: `Reading Room Management (12)` — use `totalItems` (from server count)
- **HostelManagement**: `Manage Hostels (5)` — use `hostels.length` (total fetched)
- **MessManagement**: `Manage Mess Services (3)` — use `messes.length`

Display as a small Badge or `text-muted-foreground` count next to the heading, e.g.:
```
Reading Room Management  [12]
```

### 2. Use `AdminTablePagination` Component on All Three Pages
Replace the custom inline pagination in all three pages with the shared `AdminTablePagination` component which already supports:
- "Showing X–Y of Z entries"
- Page number buttons with ellipsis
- Rows-per-page selector
- Prev/Next buttons

This gives consistent, clean pagination with page-size control everywhere.

### Files Modified
- `src/pages/RoomManagement.tsx` — add count badge, replace pagination with `AdminTablePagination`
- `src/pages/hotelManager/HostelManagement.tsx` — add count badge, replace pagination with `AdminTablePagination`, add `itemsPerPage` state
- `src/pages/admin/MessManagement.tsx` — add count badge, replace pagination with `AdminTablePagination`, add `itemsPerPage` state

