

# Fix Student Visibility Toggle — Not Persisting / Not Reading DB Value

## Root Cause
In `RoomManagement.tsx`, when cabins are fetched and mapped to the `CabinData` interface, `is_student_visible` from the database is never mapped to `isStudentVisible`. So the UI always shows the default (visible), even after toggling.

Line 129 maps `isPartnerVisible: cabin.is_partner_visible !== false` but there's no equivalent line for `isStudentVisible`.

## Fix
**`src/pages/RoomManagement.tsx`** — Add the missing mapping at line 130:
```typescript
isStudentVisible: cabin.is_student_visible !== false,
```

This is a one-line fix. The toggle handler (`onToggleStudentVisible`) and the `adminRoomsService.toggleStudentVisible` function already work correctly — the DB update succeeds, but when the list refreshes, the new value is never read back into the UI state.

Hostel and Mess components use raw DB field names (`hostel.is_student_visible`, `mess.is_student_visible`) so they should work correctly already.

## Files Modified
- `src/pages/RoomManagement.tsx` — add `isStudentVisible` mapping (1 line)

