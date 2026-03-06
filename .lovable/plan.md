

# Fix: Bottom Nav Tabs Still Overlapping

## Root Cause
The active tab's background pill (`bg-primary/10` on the inner `div`) combined with `px-1.5` padding still causes overflow because the `div` isn't constrained to the parent `flex-1` width. The inner div can grow beyond the flex item boundary.

## Fix

### `src/components/student/MobileBottomNav.tsx`
- Add `overflow-hidden` to each `Link` (the `flex-1` container) so children can't visually overflow
- Add `w-full` and `overflow-hidden` to the inner `div` to constrain the background pill
- Remove `px-1.5` padding from inner div (replace with `px-0.5`) to keep it tight
- Remove `scale-[1.1]` on active icon (scaling contributes to overflow)

These changes ensure each tab is strictly contained within its 20% width allocation.

| File | Change |
|------|--------|
| `src/components/student/MobileBottomNav.tsx` | Add overflow-hidden to Link and inner div, reduce padding, remove scale |

