

## Analysis

The search bar on the Reading Rooms page (`/cabins`) works as a **client-side filter** — it filters the already-loaded cabins list by name/area/city as you type. There is no search button or API call triggered by the search input.

The issue is that the page currently has **no cabins loaded from the database**, so typing in the search bar filters an empty list and shows nothing. The search itself is functioning correctly, but with no data to filter, it appears broken.

### Two Options

**Option A (Quick fix):** The search is already working. The "No reading rooms found" message appears because no reading rooms exist in the database yet. No code change needed — just add data.

**Option B (Enhancement):** Add a visible search button that triggers an API-based search (like `CabinSearch.tsx` does), so the search input calls `cabinsService.getAllCabins({ search: query })` on Enter/button click, making it behave like a real server-side search.

## Recommended Plan — Option B

### `src/pages/Cabins.tsx`
- Add a search icon button or trigger search on Enter key press
- Call `cabinsService.getAllCabins({ search: searchQuery, category: filter })` when the user submits a search query
- Include the search query in the `useEffect` dependency array so it re-fetches when search changes (debounced)
- Show a clear (X) button when search text is present to reset

This matches how `CabinSearch.tsx` already handles API-based search with its `handleQuickSearch` function.

### Files Modified
| File | Change |
|------|--------|
| `src/pages/Cabins.tsx` | Add API-based search on Enter + include search in fetch dependencies |

