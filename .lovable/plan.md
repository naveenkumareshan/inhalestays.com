

# Performance Optimization -- Remaining Phases

Continuing from Phase 1 (completed: dead file removal, lazy loading, React Query defaults). This covers Phases 2, 3, and 4.

---

## Phase 2: Console Log Cleanup

Remove all `console.log()` statements from 13 files (97 occurrences total). Keep `console.error()` in catch blocks.

| File | Lines to clean |
|------|---------------|
| `src/components/SeatMap.tsx` | Lines 47, 55, 71 |
| `src/components/search/CabinMapView.tsx` | Line 220 |
| `src/components/hostel-manager/HostelBookingsList.tsx` | Line 106 |
| `src/components/admin/StudentExcelImport.tsx` | Line 176 (change to `console.error`) |
| `src/components/admin/HostelRoomForm.tsx` | Line 260 |
| `src/pages/BookingDetail.tsx` | Lines 35, 78 |
| `src/components/ImageUpload.tsx` | Line 114 |
| `src/pages/StudentLogin.tsx` | Line 106 |
| `src/components/vendor/VendorPayouts.tsx` | Lines 102, 104 |
| `src/components/search/LocationSearch.tsx` | Line 66 |
| `src/contexts/AuthContext.tsx` | Line 215 |
| `src/pages/Booking.tsx` | Line 60 |
| `src/api/bookingEmailService.ts` | Lines 47, 69, 79, 99 |

---

## Phase 3: Performance Gains

### 3a. Image Lazy Loading
Add `loading="lazy"` to `<img>` tags in list/card views across 10+ files. Key targets:
- `src/components/search/CabinSearchResults.tsx` -- cabin card images
- `src/pages/Hostels.tsx` -- hostel card images
- `src/components/booking/BookingsList.tsx` -- booking list images
- `src/components/hostel-manager/HostelRoomsList.tsx` -- room list images
- `src/pages/HostelBooking.tsx` -- room images in booking flow
- `src/components/hostels/FoodMenuModal.tsx` -- food menu image
- `src/components/ImageUpload.tsx` -- uploaded image previews

Will NOT add to: logo images (above fold), layout background images (functional), or small icons.

### 3b. SeatMap Memoization
The `SeatMap.tsx` component re-renders all seat buttons on every state change. Wrap with `React.memo` and use `useCallback` for `onSeatSelect` handler to prevent unnecessary re-renders when parent state changes.

### 3c. FloorPlanViewer Seat Button Memoization
The `FloorPlanViewer` renders 100+ individual seat buttons. Ensure the seat button rendering uses `React.memo` with a custom comparator to skip re-renders when only unrelated seats change.

---

## Phase 4: Safe Risky Removals

### 4a. Delete `backend/` Directory
The entire `backend/` directory (Express.js + Mongoose) is dead code -- all data flows through Supabase now. No file in `src/` imports from `backend/`. Files to delete:
- `backend/server.js`
- `backend/package.json`
- `backend/package-lock.json`
- `backend/config/` (entire directory)
- `backend/controllers/` (entire directory)
- `backend/middleware/` (entire directory)
- `backend/models/` (entire directory)
- `backend/routes/` (entire directory)
- `backend/services/` (entire directory)

### 4b. Old Booking Flow Cleanup
Remove the legacy `Booking.tsx` route and related dead components that were partially cleaned in Phase 1. The old booking page at `/booking/:id` uses the legacy `SeatMap` and `BookingSummary` stub. The active flow uses `BookSeat.tsx` -> `SeatBookingForm` -> `DateBasedSeatMap`. Files to remove:
- `src/pages/Booking.tsx`
- `src/components/BookingSummary.tsx` (stub created in Phase 1)
- `src/components/SeatMap.tsx` (only used by Booking.tsx)
- Remove the `/booking/:id` route from `App.tsx`

---

## Summary

| Phase | Action | Impact |
|-------|--------|--------|
| 2 | Remove 97 `console.log` across 13 files | Cleaner logs, tiny perf gain |
| 3a | Add `loading="lazy"` to ~20 list-view images | Faster initial page loads |
| 3b | Memoize SeatMap component | Fewer re-renders for 100+ seats |
| 3c | Memoize FloorPlanViewer seat buttons | Smoother seat map interactions |
| 4a | Delete `backend/` directory (~50+ files) | Cleaner repo, no bundle impact |
| 4b | Remove old Booking.tsx flow (4 files + 1 route) | Less dead code |

No UI design or business logic changes. Only performance and cleanup.

