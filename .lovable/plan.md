

# Fix Admin Students Page Performance

## Problem
The Admin Students page is slow and sometimes fails to display users due to:
1. **No debounce on search** -- Every keystroke triggers a full API call (3 sequential DB queries), causing race conditions where an older response overwrites a newer one
2. **Double fetch on tab change** -- `handleTabChange` sets both `role` and `searchQuery("")`, triggering the `useEffect` twice in quick succession
3. **Three sequential queries per fetch** -- The `getUsers` service queries `user_roles`, then `profiles`, then `user_roles` again

## Changes

### 1. Add search debounce in `AdminStudents.tsx`
- Add a `debouncedSearch` state that updates 400ms after the user stops typing
- Use `debouncedSearch` in the `useEffect` dependency instead of `searchQuery`
- This eliminates race conditions from rapid typing

### 2. Fix double-fetch on tab change in `AdminStudents.tsx`
- In `handleTabChange`, batch the state updates so only one fetch is triggered
- Use the debounced search value, not raw `searchQuery`, in the effect

### 3. Optimize `adminUsersService.getUsers`
- Run the second `user_roles` query in parallel with profile mapping instead of sequentially
- Add error handling that doesn't silently fail

### 4. Add abort controller for race condition prevention
- Use an AbortController or a fetch counter to ensure only the latest request's response is applied to state

## Technical Details

| File | Change |
|------|--------|
| `src/pages/AdminStudents.tsx` | Add debounced search (useEffect with setTimeout), fix tab change double-fetch, add stale request prevention |
| `src/api/adminUsersService.ts` | Minor: no structural changes needed, queries are already reasonable for ~10 users |

The core fix is in `AdminStudents.tsx`:
- Introduce `debouncedSearch` with a 400ms delay
- Use a fetch counter (`useRef`) to discard stale responses
- Remove `searchQuery` from useEffect deps, use `debouncedSearch` instead

