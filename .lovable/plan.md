

# Convert Manual Mess Booking from Page to Side Sheet (VendorSeats Pattern)

## Problem
The manual mess booking is currently a separate page (`/admin/mess-manual-booking`). The user wants it to open as a **right-side Sheet drawer** (same as VendorSeats seat booking), triggered from the MessBookings page via the "Manual Booking" button.

## Solution
Move all the booking form logic into a Sheet within `MessBookings.tsx`, matching the VendorSeats pattern exactly:
- `Sheet` opens from right side (`w-[400px] sm:w-[440px]`)
- Compact `text-[11px]` / `text-xs` sizing matching VendorSeats
- Same flow order as the screenshot: Mess name header → Search student → Create student collapsible → Duration type pills → Duration count → Start/End dates → Price summary with discount → Partial payment checkbox → PaymentMethodSelector (linked to partner's payment modes) → Confirm button → Success view

## Changes

### `src/pages/admin/MessBookings.tsx`
- Add `Sheet` import and state (`bookingSheetOpen`)
- Change "Manual Booking" button to open the sheet instead of navigating
- Add all mess booking form logic inside a `<Sheet>` component:
  - **Header**: Selected mess name + package info
  - **Step 1**: Mess selector pills (fetch partner's messes)
  - **Step 2**: Package selector pills
  - **Step 3**: Student search + collapsible create (compact `h-7`/`h-8` inputs, `text-[11px]`)
  - **Step 4**: Duration type pills (Daily/Weekly/Monthly) + count input
  - **Step 5**: Start date (Popover Calendar) + computed End date display
  - **Step 6**: Price summary box (`bg-muted/30 border rounded p-3`) with discount inputs
  - **Step 7**: Partial Payment checkbox + advance amount input
  - **Step 8**: "Book" button → Confirmation step with `PaymentMethodSelector`, txn ID, proof upload, collected by, then Confirm button
  - **Success view**: Same pattern as VendorSeats (checkmark, summary, close)
- Use `PaymentMethodSelector` component (linked to partner's configured payment modes) instead of hardcoded pills
- On success: close sheet + refresh subscriptions list

### `src/pages/admin/ManualMessBooking.tsx`
- Keep file but it becomes unused (or delete route)

### `src/App.tsx`
- Remove `/admin/mess-manual-booking` route (optional cleanup)

### `src/components/admin/AdminSidebar.tsx`
- Remove "Manual Booking" sidebar item under Mess section (no longer a page)

### Key UI Pattern (matching VendorSeats exactly)
```
Sheet (right, 400-440px, overflow-y-auto)
├── SheetHeader: "New Mess Subscription"
├── Separator
├── Mess pills (horizontal scroll)
├── Package pills (after mess selected)
├── Separator
├── "BOOK THIS MESS" label
├── Student search (h-8 text-xs)
├── Create Student collapsible (h-7 inputs)
├── Duration Type pills (Daily/Weekly/Monthly)
├── Duration count input (h-8)
├── Start/End date row (grid-cols-2)
├── Price summary box (seat amount, discount inputs, total)
├── Partial Payment checkbox + advance input
├── "Book" button
├── ── Confirmation step ──
├── Read-only summary
├── PaymentMethodSelector (partner modes)
├── Txn ID + Proof upload
├── Collected by
├── Back + Confirm buttons
└── ── Success view ──
```

