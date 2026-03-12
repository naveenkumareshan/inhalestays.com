

# Add "Room View" to Reading Room Seat Control Center

## What
Add a third "Room View" mode (same as hostel bed map) to `VendorSeats.tsx` that groups seats by their cabin (room), showing a header per cabin followed by inline seat cards.

```text
┌─────────────────────────────────────────────────┐
│ 📖 Library Hall  (12 seats)                      │
│ [L1-S1 ₹500] [L1-S2 ₹500] [L1-S3 ₹500] ...    │
├─────────────────────────────────────────────────┤
│ 📖 Study Room A  (8 seats)                       │
│ [S1-S1 ₹400] [S1-S2 ₹400] ...                   │
└─────────────────────────────────────────────────┘
```

## Changes — `src/pages/vendor/VendorSeats.tsx`

1. **Type** (line 47): `'grid' | 'table'` → `'grid' | 'table' | 'room'`

2. **View toggle** (~lines 893-899): Add third `Building2` icon button for room view

3. **Room View block** (after grid view, before table view ~line 998): New `viewMode === 'room'` section that:
   - Groups `filteredSeats` by `cabinId` + `floor` into room groups
   - Each group shows a header with cabin name, floor, category, seat count
   - Below: horizontal flex-wrap of seat cards (same content as grid cards — label, category, price, status, student name, hover actions)
   - Cards use same `statusColors`, `seatLabel`, `statusIcon`, click handlers

