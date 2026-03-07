

# Plan: Revamp Mess Detail Page — Hostel-Style UX

## Issues Identified
1. **UUID in URL**: Marketplace navigates to `/mess/{uuid}` instead of using `serial_number` (e.g., `IS-MESS-2026-00001`)
2. **Detail page layout**: Current tab-based UI doesn't match hostel pattern (no share button, no rating display, no starting price, no info chips)
3. **Booking flow**: Currently a simple "Subscribe" button with a dialog. Needs a step-based flow like hostels: Select Meal Type → Select Duration → Review & Pay
4. **No starting price**: `mess_partners` has no `starting_price` field; marketplace shows no price

## Changes

### 1. Database Migration
- Add `starting_price` column to `mess_partners` (nullable numeric, default null)
- Add `average_rating` and `review_count` columns to `mess_partners` (to display in detail page like hostels)

### 2. `src/utils/shareUtils.ts`
- Add `generateMessShareText` function (parallel to hostel's share text generator)

### 3. `src/pages/MessMarketplace.tsx`
- Navigate to `/mess/${m.serial_number || m.id}` instead of UUID
- Show starting price on each card (from `starting_price` or computed from min package price)

### 4. `src/pages/MessDetail.tsx` — Full Rewrite
Replace the current tab + dialog approach with a hostel-style stepped booking flow:

**Hero Section** (collapsible like hostels):
- Image slider
- Back button overlay
- Name + Share button + Rating
- Location
- Info chips (food type, starting price, capacity)
- Details & description card
- "View Menu" button inside details card (weekly menu table in a dialog/modal)
- Meal timings displayed inline

**Step 1: Select Meal Plan**
- Pill-based selection: Breakfast, Lunch, Dinner, Lunch+Dinner, Full Day (all 3)
- Filter available packages based on selected meal types

**Step 2: Select Duration**
- Duration type toggle (Daily / Weekly / Monthly) — only show types that have matching packages
- Duration count selector
- Start date picker + computed end date

**Step 3: Review & Pay**
- Booking summary (mess name, meal plan, duration, dates)
- Price breakdown
- Terms checkbox
- Pay button (creates subscription + receipt)

**Reviews section**: Shown below the booking flow (not in a tab)

### 5. `src/components/admin/MessEditor.tsx`
- Add `starting_price` field in Basic Information section

### 6. `src/api/messService.ts`
- Add `getMessPartnerBySerialNumber` function for serial number lookup
- Update `getMessPartnerById` for UUID lookup

## File Summary

| File | Change |
|------|--------|
| Database migration | Add `starting_price`, `average_rating`, `review_count` to `mess_partners` |
| `src/utils/shareUtils.ts` | Add `generateMessShareText` |
| `src/pages/MessMarketplace.tsx` | Use serial_number in URLs, show starting price |
| `src/pages/MessDetail.tsx` | Full rewrite: hostel-style hero + 3-step booking flow |
| `src/components/admin/MessEditor.tsx` | Add starting_price field |
| `src/api/messService.ts` | Add serial number lookup function |

