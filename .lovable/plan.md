

# Fix Grid Card Alignment — Long Names Breaking Layout

## Problem
Student names with many characters cause grid cards to expand beyond their expected width, breaking the uniform grid alignment across all view modes (Grid, Room) in both the Seat Map and Hostel Bed Map.

## Root Cause
The grid cards use `minmax(72px, 1fr)` for auto-fill but have no `max-width` constraint. The `truncate` class on the name label needs a pixel-constrained parent width to work — without it, the card stretches to fit the text content.

## Fix — 4 locations across 2 files

### `src/pages/vendor/VendorSeats.tsx`

1. **Grid View card** (~line 938): Add `max-w-[90px] overflow-hidden` to the card div so all cards stay uniform width
2. **Room View card** (~line 1033): Change `max-w-[80px]` to `w-[76px]` (fixed width) and add `overflow-hidden`

### `src/pages/admin/HostelBedMap.tsx`

3. **Grid View card** (~line 1249): Add `max-w-[90px] overflow-hidden` to the card div
4. **Room View card** (~line 1324): Add `w-[72px] overflow-hidden` for fixed-width bed cards

All name labels already have `truncate w-full` — these will now properly truncate since the parent has a constrained width. Category labels also get constrained.

