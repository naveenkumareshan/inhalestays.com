

# Add Missing Features to Room View Cards

## Problem
Room View cards are missing features present in Grid View:
- **Hostel Bed Map Room View**: Missing hover actions (Block, Edit Price, Info buttons), category label, and price edit inline button
- **Seats Room View**: Missing category label

## Changes

### `src/pages/admin/HostelBedMap.tsx` (~lines 1319-1343)
Add to room view bed cards:
1. Category label: `<span className="text-[9px] text-muted-foreground truncate w-full">{bed.category || bed.roomCategory}</span>`
2. Inline price edit button (same as grid)
3. `group` class on card container
4. Hover overlay with Block/Unblock, Edit Price, Info buttons (copy from grid view lines 1278-1288)

### `src/pages/vendor/VendorSeats.tsx` (~lines 1037-1038)
Add category label to room view seat cards:
- `<span className="text-[9px] text-muted-foreground truncate w-full leading-tight">{seat.category}</span>` after seat label

