

# Decouple Duration Type from Package — Add to Booking Flow Instead

## Problem
Currently, `duration_type` and `duration_count` are stored on the `mess_packages` table and set during package creation. The user wants:
1. **Package creation**: Only name, price, and meals selection — no duration fields
2. **Manual booking** (partner side): Duration type (daily/weekly/monthly) + count as a separate step after package selection
3. **Student side**: Same — duration type selection independent of package (already partially exists but tied to package filtering)

## Changes

### 1. `src/pages/admin/MessManagement.tsx` — Remove duration from package form
- Remove `duration_type` and `duration_count` from `pkgForm` state
- Remove the Duration Type `<Select>` and Duration Count `<Input>` from the form
- Stop passing `duration_type`/`duration_count` to `upsertMessPackage`
- In the package list display, remove the `{p.duration_count} {p.duration_type}` text

### 2. `src/pages/admin/MessBookings.tsx` — Add duration type to booking sheet
- Add state: `durationType` ('daily'|'weekly'|'monthly', default 'monthly') and `durationCount` (number, default 1)
- After package pills and before student search, add:
  - Duration Type pills (Daily / Weekly / Monthly)
  - Duration Count input
- Update `recalcEndDate` to use the new `durationType`/`durationCount` state instead of reading from `selectedPackage`
- Update `handlePackageSelect` to not rely on `pkg.duration_type`
- Calculate price as `selectedPackage.price * durationCount`
- Update `handleStartDateChange` accordingly

### 3. `src/pages/MessDetail.tsx` — Fix student-side duration selection
- Already has `durationType` and `durationCount` state — good
- Remove the logic that filters packages by `duration_type` (`availableDurationTypes`, `matchingPackages` filtering by `p.duration_type`)
- Instead: after selecting a meal plan, show all matching packages (by meal_types only), then show duration type pills independently
- Price calculation: `selectedPackage.price * durationCount` (already partially there)
- Remove the `availableDurationTypes` useMemo that reads `p.duration_type` from packages

### Files Modified
- `src/pages/admin/MessManagement.tsx` — Remove duration fields from package form
- `src/pages/admin/MessBookings.tsx` — Add duration type/count to booking sheet
- `src/pages/MessDetail.tsx` — Decouple duration from package filtering

