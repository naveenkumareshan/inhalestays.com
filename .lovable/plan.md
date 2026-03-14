

# Reformat Manual Mess Booking to Match Reading Room Layout

## Problem
The current `ManualMessBooking.tsx` uses a compact card-based stepper with tiny badges, `text-xs` inputs, and `max-w-2xl` constraint. The reading room `ManualBookingManagement.tsx` uses a full-width layout with numbered circle step indicators connected by lines, standard-sized Cards with normal inputs, and a more spacious horizontal form layout.

## Solution
Rewrite `ManualMessBooking.tsx` to match the reading room's layout pattern exactly:

### Layout Changes
- Remove `max-w-2xl` constraint — use full width like reading room
- Replace badge-based step indicator with numbered circles + connecting lines (same as reading room lines 1076-1088)
- Use standard-sized inputs (default `h-10`) instead of `h-8 text-xs`
- Use normal `CardTitle` sizes instead of `text-sm`
- Use `Collapsible` for "Create New Student" section (same as reading room)
- Use full `Card > CardHeader > CardContent` pattern with proper spacing

### Step Flow (adapted for mess context)
1. **Select Student** — Same search + create pattern as reading room (with `Collapsible`, full-width inputs, selected badge)
2. **Select Mess** — Grid of mess cards (like cabin selection grid with `md:grid-cols-2 lg:grid-cols-3`)
3. **Select Package** — Grid of package cards (like cabin selection)
4. **Select Dates** — `grid-cols-1 md:grid-cols-2` with start date, duration info, end date, Continue button
5. **Payment Details** — `grid-cols-1 md:grid-cols-2` layout with all payment fields at normal size, summary section, payment proof
6. **Review & Create** — Summary card with Create button

### Step Indicator
```typescript
const allSteps = ['student','mess','package','dates','payment','review'];
const stepLabels = ['Select Student','Select Mess','Select Package','Select Dates','Payment Details','Review & Create'];
// Render numbered circles with connecting lines (same JSX as reading room)
```

## Files Modified
- `src/pages/admin/ManualMessBooking.tsx` — full rewrite of JSX layout to match reading room format

