

# Plan: Align Mess Marketplace Cards with Reading Room Pattern

## Problem
The Mess marketplace (`MessMarketplace.tsx`) currently uses large aspect-video cards in a grid with a dialog-based detail view. This is inconsistent with Reading Rooms (`Cabins.tsx` + `CabinsGrid.tsx`) which use compact horizontal cards (80x80 thumbnail + content) with category filter pills and navigation to a dedicated detail page.

## Changes

### 1. Rewrite `MessMarketplace.tsx` — Match `Cabins.tsx` Structure
Replace the current large-card + dialog approach with:
- **Sticky header** with title "Food / Mess" and food-type filter pills (All, Veg, Non-Veg, Both) — same pattern as Reading Room's category pills
- **Compact horizontal cards** matching `CabinsGrid` layout:
  - 80x80 thumbnail with food-type badge overlay (Veg/Non-Veg/Both)
  - Name, location (MapPin), description truncated
  - Rating + price + "View" CTA button
- **Loading skeletons** matching Reading Room pattern
- **Navigation** to a new detail page `/mess/:id` instead of dialog

### 2. Create `src/pages/MessDetail.tsx` — Dedicated Detail Page
A standalone page (like `HostelRoomDetails.tsx` / `BookSeat.tsx`) containing:
- Mess images, name, location, food type, description
- Tabs: Menu, Packages (with Subscribe), Timings, Reviews
- All the existing dialog content moves here
- Max-width constrained (`max-w-3xl`) matching hostel/reading room detail pages

### 3. Add Route in `App.tsx`
- Add `/mess/:id` route pointing to `MessDetail.tsx`

### Files Summary

| File | Action |
|------|--------|
| `src/pages/MessMarketplace.tsx` | Rewrite: compact cards + filter pills + navigate to detail page |
| `src/pages/MessDetail.tsx` | Create: dedicated detail page with menu/packages/timings/reviews |
| `src/App.tsx` | Add `/mess/:id` route |

