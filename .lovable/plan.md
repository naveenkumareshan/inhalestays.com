

# Match Hostels Header to Reading Rooms Layout

## What Changes

The Hostels page header will be restructured to exactly match the Reading Rooms (CabinSearch) layout shown in the screenshot:

1. **Title**: "Hostels" (same style as "Reading Rooms")
2. **Search bar + Filters button side by side** (not stacked): Search input on the left, "Filters" pill button on the right -- identical to the Reading Rooms layout
3. **Gender filter moves into a bottom-sheet filter drawer** (same as Reading Rooms' filter sheet), instead of being inline pills in the header
4. **Active filter chips** appear below the search bar when a gender filter is active (same pattern as category/location chips in Reading Rooms)

## Technical Details

**File**: `src/pages/Hostels.tsx`

1. Add imports: `SlidersHorizontal`, `X` from lucide-react; `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetFooter` from UI; `Button` from UI; `Input` from UI
2. Add state: `filtersOpen` (boolean), `draftGenderFilter` (string) for the filter drawer
3. Replace the current header layout:
   - Title row: `<h1>Hostels</h1>`
   - Search row: `<Input>` (with Search icon, flex-1) + Filters pill button (with badge count) -- side by side in a `flex gap-2` row
   - Active filter chips row (conditional): shows gender badge with X to clear
4. Remove inline gender filter pills from the header
5. Add a `<Sheet>` bottom drawer (same as Reading Rooms) containing:
   - Gender filter selection (All / Male / Female / Co-ed) as pill buttons
   - Reset + Apply Filters buttons in the footer
6. Filter logic stays the same (client-side filtering on gender + search query)

The result will be visually identical to the Reading Rooms header: compact search bar with a Filters button beside it, and a bottom-sheet drawer for advanced filters.
