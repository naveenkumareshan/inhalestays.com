

# Plan: Add Consistent Search Bar to All Three Marketplaces

## Current State
- **Cabins (Reading Rooms)**: No search bar — only category filter pills
- **Hostels**: Has a search bar + filter drawer (different pattern)
- **Mess**: No search bar — only food-type filter pills

## Changes

### Consistent Search Bar Pattern
Add a compact search input between the title and filter pills in all three pages. Same styling:
```
Search icon (left) | placeholder text | h-8 rounded-xl border text-[12px]
```

### 1. `src/pages/Cabins.tsx`
- Add `searchQuery` state
- Add search input after `<h1>`, before filter pills
- Filter cabins by name/area/city client-side before passing to `CabinsGrid`

### 2. `src/pages/Hostels.tsx`
- Already has `searchQuery` state and filtering logic
- **Remove** the Sheet drawer, filter button, draft state, and active filter chips
- **Replace** with inline gender filter pills (matching Cabins pattern)
- Keep search bar but restyle to match the new compact pattern

### 3. `src/pages/MessMarketplace.tsx`
- Add `searchQuery` state
- Add search input after `<h1>`, before filter pills
- Filter messes by name/location client-side

### Search Input Template (identical across all three)
```tsx
<div className="relative mb-2">
  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
  <input
    type="text"
    placeholder="Search..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className="w-full h-8 pl-8 pr-3 rounded-xl border border-border bg-card text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
  />
</div>
```

### Files Modified
| File | Change |
|------|--------|
| `src/pages/Cabins.tsx` | Add search state + search input + client-side name filtering |
| `src/pages/Hostels.tsx` | Remove Sheet/drawer, replace with inline pills + consistent search bar |
| `src/pages/MessMarketplace.tsx` | Add search state + search input + client-side name filtering |

