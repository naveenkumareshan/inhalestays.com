

# Plan: Fix Add Property Navigation + Add Multi-Seat/Bed Placement

## Issue 1: "Add New Property" button navigates to profile instead of starting property creation

Currently all three property type buttons in the `ManageProperties` dialog navigate to `/partner/profile`. They should instead open the property creation flow directly within the current page.

**Fix in `src/pages/partner/ManageProperties.tsx`:**
- For **Reading Room**: Set `showEditor(true)` on the RoomManagement tab by switching to the `rooms` tab and triggering a "new cabin" action. Since `RoomManagement` is a lazy-loaded page with its own `showEditor` state, the simplest approach is to:
  - Switch the active tab to the correct property type
  - Pass a query param or use a shared state/ref to signal "create new"
  - Alternative (simpler): navigate to a dedicated route like `/partner/properties?tab=rooms&action=new`

Actually, the cleanest approach: Instead of navigating away, switch the active tab and communicate the "add new" intent via a state prop passed to the lazy-loaded child components.

**Changes:**
- `ManageProperties.tsx`: Convert `defaultTab` to controlled state. On dialog button click, set the active tab and a `triggerNew` flag. Pass `triggerNew` as a prop to `RoomManagement` / `HostelManagement` / `LaundryPartnerDashboard`.
- `RoomManagement.tsx`: Accept an optional `autoCreateNew` prop. When it transitions from false to true, call `handleNewCabin()` to open the editor.
- `HostelManagement.tsx`: Same pattern — accept `autoCreateNew` and trigger the hostel creation flow.

## Issue 2: Add option to place multiple seats/beds at once by specifying a count

Currently, the `FloorPlanDesigner` (seats) and `HostelBedPlanDesigner` (beds) place one seat/bed per click. The user wants a "place multiple" option that asks for a count and auto-arranges them.

**Note:** An `AutoSeatGenerator` component already exists but is not wired into the `FloorPlanDesigner`. For beds, no such component exists.

**Changes:**

### Seats (`FloorPlanDesigner.tsx`)
- Add a "Add Multiple Seats" button to the toolbar (next to "Place Seats")
- Wire up the existing `AutoSeatGenerator` component: open it on button click, pass `roomWidth`, `roomHeight`, `GRID_SNAP`, and `seats.length`
- On generate, call `onPlaceSeat` for each generated seat

### Beds (`HostelBedPlanDesigner.tsx`)
- Add a "Add Multiple Beds" button to the toolbar
- Create a simple dialog (inline or new component) that asks for count, sharing option, and category
- On confirm, auto-place beds in a grid pattern within the room, calling `onPlaceBed` for each

### Seat Placement Dialog Enhancement
- In `SeatPlacementDialog` (inside `FloorPlanDesigner.tsx`), add a "Count" field (default 1). When count > 1, place that many seats starting from the clicked position, auto-incrementing seat numbers and arranging in a row/grid pattern.

## Files to Change

| File | Change |
|------|--------|
| `src/pages/partner/ManageProperties.tsx` | Use controlled tab state; pass create-new signal to children |
| `src/pages/RoomManagement.tsx` | Accept `autoCreateNew` prop, trigger editor open |
| `src/pages/hotelManager/HostelManagement.tsx` | Accept `autoCreateNew` prop, trigger create flow |
| `src/components/seats/FloorPlanDesigner.tsx` | Add "Add Multiple" button, integrate `AutoSeatGenerator`, add count field to placement dialog |
| `src/components/hostels/HostelBedPlanDesigner.tsx` | Add "Add Multiple Beds" button with count dialog |

