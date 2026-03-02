

# Merge Months Dropdown with Packages

## What Changes
Remove the separate "Choose Package" section (step 4/5) entirely. Instead, integrate package data directly into the months dropdown in the "Stay Duration" section. Each month option will show the discount percentage from matching packages beside it (e.g., "3 Months - 10% off"). Selecting a month auto-applies the matching package's discount to all calculations.

## How It Works

### 1. Fetch packages in `HostelRoomDetails.tsx`
- Fetch all packages for the hostel/durationType when the page loads (move fetch logic from `StayDurationPackages` into the parent)
- Build a map of `min_months -> package` for quick lookup

### 2. Update the Months dropdown (lines 717-733)
- For each month option in the Select, check if a package exists for that month count
- If yes, show the discount beside the label: `"3 Months (10% off)"` or `"6 Months (15% off)"`
- When user selects a month, auto-set `selectedStayPackage` to the matching package (or null if no package for that duration)

### 3. Remove "Choose Package" section (lines 836-852)
- Delete the entire step 4 "Choose Package" block that renders `StayDurationPackages`
- Re-number subsequent step badges (Food Plan, etc.)

### 4. Update `handleSelectPackage` / durationCount logic
- Replace with inline logic: when `durationCount` changes in the dropdown, find the best matching package (where `min_months <= durationCount`) and auto-apply it
- The discount calculation already works via `selectedStayPackage.discount_percentage` (line 396-398)

## Files Changed

| File | Change |
|------|--------|
| `src/pages/HostelRoomDetails.tsx` | Fetch packages on load; update months dropdown to show discounts; remove "Choose Package" section; auto-match package on month change |

No database changes needed. `StayDurationPackages.tsx` can remain as-is (unused but harmless) or be cleaned up later.

