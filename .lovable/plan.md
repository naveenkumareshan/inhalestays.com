

# Fix: Partner Selection Showing All Partners

## Problem
When a partner adds a property via `RoomManagement.tsx`, the `CabinEditor` receives `isAdmin={true}` (hardcoded), which causes it to fetch and display ALL partners in a dropdown. Partners should only see their own details auto-filled, not a selection of other partners.

## Root Cause
`src/pages/RoomManagement.tsx` line 515: `isAdmin={true}` is hardcoded instead of using the already-computed `isAdmin` variable (line 67: `const isAdmin = user?.role === 'admin'`).

## Fix

| File | Change |
|------|--------|
| `src/pages/RoomManagement.tsx` | Line 515: Change `isAdmin={true}` to `isAdmin={isAdmin}` so partners get `false` and only see their own details |

This is a one-line fix. When `isAdmin` is `false`, the `CabinEditor` skips fetching all partners and instead auto-loads the current user's profile as the partner (lines 181-200 of CabinEditor).

