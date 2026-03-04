

# Fix: Seat Drag Alignment + Category in Auto-Generator + Floor Filter in Seat Map

## Issues

1. **Dragged seats don't align to grid**: Seats are generated with `SEAT_W + 6 = 42px` spacing, but when dragged they snap to `GRID_SNAP = 40px` grid via `snapToGrid()`. This causes misalignment — a seat at x=102 snaps to x=120 on drag.

2. **Auto-generator doesn't ask for category**: `handleAutoGenerate` hardcodes `categories[0]?.name || 'Non-AC'` for all bulk-generated seats. The `AutoSeatGenerator` dialog has no category selector.

3. **Seat Map page (VendorSeats) has no floor filter**: The `/admin/seats-available-map` page fetches all seats across all floors but provides no UI to filter by floor. Users see seats from every floor mixed together.

## Changes

### 1. Fix drag snapping (`FloorPlanDesigner.tsx`)
- Remove `snapToGrid` from `handleCanvasMouseMove` (lines 178-179) and `handleCanvasMouseDown` placement (line 159)
- Use the same 42px-aligned snap: change `GRID_SNAP` to match `SEAT_W + 6 = 42` for consistent alignment, OR remove snapping entirely during drag (use raw positions like generation does)
- Simplest fix: set `GRID_SNAP = SEAT_W + 6` (42) so dragged seats align to the same grid as generated ones

### 2. Add category selector to AutoSeatGenerator (`AutoSeatGenerator.tsx`)
- Add `categories` prop: `SeatCategoryOption[]`
- Add a `selectedCategory` state with a `Select` or `RadioGroup` to pick category
- Pass selected category name back through `GeneratedSeat` (add `category` field)
- In `FloorPlanDesigner.tsx`, pass `categories` prop to `AutoSeatGenerator` and use `gs.category` instead of hardcoded `categories[0]?.name`

### 3. Add floor filter to Seat Map page (`VendorSeats.tsx`)
- Add `selectedFloor` state (default `'all'`)
- When a specific cabin is selected, read its `floors` array from `cabins` to populate a floor selector dropdown
- Filter `filteredSeats` by `seat.floor === selectedFloor` when not `'all'`
- Place the floor selector in the filter row, after the cabin selector

## Files to Change

| File | Change |
|------|--------|
| `src/components/seats/FloorPlanDesigner.tsx` | Change GRID_SNAP to 42 to match generation spacing; pass categories to AutoSeatGenerator; use `gs.category` from generated seats |
| `src/components/seats/AutoSeatGenerator.tsx` | Add categories prop, category selector UI, include category in GeneratedSeat output |
| `src/pages/vendor/VendorSeats.tsx` | Add selectedFloor state, floor selector dropdown, filter seats by floor |

