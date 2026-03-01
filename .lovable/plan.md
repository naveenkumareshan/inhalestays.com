

# Unify Hostel Filters to Match Study Rooms UI

## What's Changing

The Hostels page (`/hostels`) currently has a busy filter area with a search bar, "Near Me" button, gender pills, and city pills all in the sticky header. The Study Rooms page (`/cabins`) has a much cleaner layout: just a title and a single row of category filter pills.

We'll simplify the Hostels sticky header to follow the same pattern as Study Rooms.

## Before vs After

| Element | Current (Hostels) | New (Matching Study Rooms) |
|---------|-------------------|---------------------------|
| Title | "Find Your Hostel" | "Hostels" |
| Search bar | Full search input in header | Removed from header |
| Near Me button | In filter row | Removed |
| Gender filters | Male / Female / Co-ed pills | Kept as filter pills (same style as category pills in Study Rooms) |
| City filters | City name pills with Hotel icon | Removed |
| Layout | Search + 2 rows of pills | Single row of gender filter pills |

The sticky header will contain only:
1. Title: "Hostels"
2. One row of filter pills: `All`, `Male`, `Female`, `Co-ed` (matching the rounded-xl, text-[11px], h-8 pill style from Study Rooms)

## Technical Details

**File**: `src/pages/Hostels.tsx`

1. Remove the search `Input` from the sticky header
2. Remove the "Near Me" `Button`
3. Remove city filter pills
4. Add an "All" pill to the gender filters (to clear filter), matching Study Rooms' category pill pattern
5. Keep existing `filteredHostels` logic but remove `searchQuery` and `cityFilter` state since they're no longer needed
6. Remove `handleFindNearby`, `handleCityChange`, cities state, and related imports
7. Match the exact same header structure: title + single pill row with identical styling

