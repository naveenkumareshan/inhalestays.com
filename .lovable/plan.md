

# Touch-Friendly Bed Map — Tap & Long-Press Interactions

## Problem
The bed cards use CSS `group-hover` to reveal action buttons (Lock, Edit Price, Details). This works with a mouse cursor but fails on touch devices — fingers can't hover, so those actions are unreachable in the native app.

## Solution: Tap = Details Sheet, Long-Press = Context Actions

### Interaction Model
- **Single tap** → Opens the booking/details sheet (already works via `handleBedClick`)
- **Long press (500ms)** → Shows a floating context menu with quick actions: Block/Unblock, Edit Price, Details, Transfer (if booked)
- **Desktop hover** → Remains unchanged (CSS `group-hover` still works)

### Implementation

**File**: `src/pages/admin/HostelBedMap.tsx`

1. **Add a `useLongPress` hook inline** — tracks `touchstart`/`touchend` timers. On long press, sets `contextMenuBed` state + position instead of navigating.

2. **Add a Context Menu Popover** — a small floating menu anchored near the pressed bed card with actions:
   - Lock/Unlock bed
   - Edit Price
   - View Details (opens sheet)
   - Transfer (if bed is booked)

3. **Prevent tap-through on long press** — the long press handler calls `preventDefault` and sets a flag so the normal `onClick` (which opens the sheet) doesn't also fire.

4. **Apply to both Grid and Room views** — both use identical card markup with `group-hover` overlays. Add touch handlers to both.

### Touch Handler Logic
```text
touchStart → start 500ms timer, record position
touchMove → if moved >10px, cancel timer (user is scrolling)
touchEnd → if timer hasn't fired, let normal onClick handle it
            if timer fired, show context menu, prevent onClick
```

### Context Menu UI
A small `Popover` or absolutely-positioned card near the bed showing 3-4 icon buttons in a row with labels — same actions as the hover overlay but larger (touch-friendly, ~40px tap targets).

### Changes Summary
- Add `contextMenuBed` and `contextMenuPosition` state
- Add `handleTouchStart` / `handleTouchEnd` / `handleTouchMove` handlers
- Add a context menu component (rendered once, positioned dynamically)
- Attach touch handlers to bed cards in both grid and room views
- No changes to desktop hover behavior

