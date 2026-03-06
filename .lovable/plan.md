

# Plan: Align Hostel Marketplace Cards with Reading Room Pattern

## Problem
The Hostels page (`Hostels.tsx`) uses a search bar + filter button (sheet drawer) while Reading Rooms (`Cabins.tsx`) uses simple inline filter pills in the sticky header. The user wants exact same UI pattern.

## Changes

### `src/pages/Hostels.tsx` — Rewrite to match `Cabins.tsx`
- **Remove**: Search bar, SlidersHorizontal filter button, Sheet drawer, draft filter state
- **Add**: Inline gender filter pills (All, Male, Female, Co-ed) in the sticky header — same `px-3 py-1 rounded-xl border text-[11px]` styling as Reading Room category pills
- **Keep**: Same compact horizontal card layout (already matching), sponsored listing logic, navigation to `/hostels/:id`
- Result: Sticky header has only title + pill filters, matching Reading Rooms exactly

### Files Modified
| File | Change |
|------|--------|
| `src/pages/Hostels.tsx` | Replace search+drawer filters with inline gender pills matching Cabins.tsx pattern |

