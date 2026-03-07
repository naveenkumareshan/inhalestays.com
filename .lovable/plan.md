

# Plan: Add Reading Room + Floor prefix to seat labels

## Problem
When viewing "All Reading Rooms", all seats show as S1, S2, etc. with no way to tell which reading room or floor they belong to — causing confusion.

## Solution
Create a helper function that generates a descriptive seat label like `A1-S1` (first letter of cabin name + floor number + seat number). Use it everywhere seat labels appear in VendorSeats.tsx.

**Label format**: `{CabinInitial}{Floor}-S{Number}`
- Example: Reading Room "Alpha", Floor 2, Seat 5 → `A2-S5`
- Example: Reading Room "Beta", Floor 1, Seat 12 → `B1-S12`

When a specific reading room is selected (not "All"), we can simplify to `F{Floor}-S{Number}` since the room is already known from the filter.

## Changes

### `src/pages/vendor/VendorSeats.tsx`
Add a helper function:
```tsx
const seatLabel = (seat: VendorSeat) => {
  const initial = seat.cabinName?.charAt(0)?.toUpperCase() || '?';
  return selectedCabinId === 'all' 
    ? `${initial}${seat.floor}-S${seat.number}`
    : `F${seat.floor}-S${seat.number}`;
};
```

Replace all 4 occurrences of `S{seat.number}` / `S{s.number}`:
1. **Line 875** (grid card) — `seatLabel(seat)`
2. **Line 942** (table row) — `seatLabel(seat)`
3. **Line 2057** (transfer dialog) — use `s.cabinName?.charAt(0)` prefix
4. Also update search filter to match against the new label format

| File | Change |
|------|--------|
| `src/pages/vendor/VendorSeats.tsx` | Add `seatLabel()` helper, replace 4 label occurrences |

