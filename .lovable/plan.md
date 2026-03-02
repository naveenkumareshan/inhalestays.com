

# Fix: Package Selection Should Update Duration, Dates, and Food Amount

## Problem
When a user selects a stay package (e.g., 3-month or 6-month), three things are broken:
1. **Price breakdown** still calculates for only 1 month (durationCount stays at 1)
2. **Check-out date** doesn't change (still shows 1 month from check-in)
3. **Food amount** for optional food also only charges 1 month

## Root Cause
In `src/pages/HostelRoomDetails.tsx`, `onSelectPackage` is set to `setSelectedStayPackage` (line 843), which only updates the package state. It does **not** update `durationCount` to the package's `min_months`. All calculations (endDate, totalPrice, foodAmount) depend on `durationCount`, which remains at 1.

## Fix

### File: `src/pages/HostelRoomDetails.tsx`

**Change 1: Update durationCount when a package is selected**

Replace the direct `setSelectedStayPackage` callback with a handler that also sets `durationCount` to the package's `min_months`:

```typescript
const handleSelectPackage = (pkg: StayPackage) => {
  setSelectedStayPackage(pkg);
  setDurationCount(pkg.min_months);
};
```

Then pass `handleSelectPackage` instead of `setSelectedStayPackage` as the `onSelectPackage` prop to `StayDurationPackages` (line 843).

This single change fixes all three issues because:
- `endDate` is derived from `durationCount` (line 261-263)
- `totalPrice` is `discountedPrice * durationCount + foodAmount` (line 422)
- `foodAmount` uses `durationCount` in its calculation (line 421)

No database changes needed. No other files need modification.

| File | Change |
|------|--------|
| `src/pages/HostelRoomDetails.tsx` | Add `handleSelectPackage` handler that updates both `selectedStayPackage` and `durationCount`; pass it as `onSelectPackage` prop |

