

# Improve Desktop Layout for Reading Room and Hostel Detail Pages

## Problem
Both the Reading Room detail page (`BookSeat.tsx`) and Hostel detail page (`HostelRoomDetails.tsx`) are built mobile-first with no max-width constraint. On desktop screens, the hero image stretches the entire browser width and all content (chips, amenities, booking form) spreads across the full viewport, making the layout feel scattered and unappealing.

On mobile, the layout works great (as you noted). The fix needs to constrain the desktop layout without breaking the mobile experience.

## Solution
Wrap the main content of both pages in a centered container with `max-w-3xl mx-auto` (about 768px) so on desktop the layout feels like a well-structured card/column rather than scattered full-width content. This matches the reference screenshots (image-112 and image-113) where the content is neatly contained.

## Changes

### 1. `src/pages/BookSeat.tsx` - Reading Room Detail Page
- Wrap the entire page content (after the outer `div`) in a `max-w-3xl mx-auto` container
- This constrains the hero image, info chips, details section, and booking form to a comfortable desktop width
- Mobile layout remains unchanged since `max-w-3xl` only kicks in on wider screens

### 2. `src/pages/HostelRoomDetails.tsx` - Hostel Detail Page
- Same approach: wrap the main content area in a `max-w-3xl mx-auto` container
- Constrains the hero slider, info chips, amenities, and the multi-step booking flow
- Mobile layout stays the same

## Technical Details

Both files need the same small change -- adding a wrapper div with desktop-constraining classes:

```text
Before:
<div className="min-h-screen bg-background pb-24">
  ... full-width content ...
</div>

After:
<div className="min-h-screen bg-background pb-24">
  <div className="max-w-3xl mx-auto">
    ... now constrained on desktop ...
  </div>
</div>
```

The sticky collapsed header (shown when hero is scrolled away) will also be constrained within this container, keeping it visually consistent.

### Files Modified
| File | Change |
|------|--------|
| `src/pages/BookSeat.tsx` | Add `max-w-3xl mx-auto` wrapper inside the outer div |
| `src/pages/HostelRoomDetails.tsx` | Add `max-w-3xl mx-auto` wrapper inside the outer div |

No new dependencies or database changes required.
