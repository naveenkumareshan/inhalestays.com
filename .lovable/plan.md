

# Fix Food Policy in Admin Hostel Editor

## Problem
The Food Policy feature was added to `HostelForm.tsx`, but the admin actually uses `HostelEditor.tsx` (the collapsible section-based editor) to manage hostels. That component still uses the old `food_enabled` boolean switch instead of the new 3-tier Food Policy selector.

## Changes

### Update `src/components/admin/HostelEditor.tsx`

1. **Replace `food_enabled` with `food_policy_type` in state initialization** (line 66):
   - Add `food_policy_type` field, reading from `existingHostel?.food_policy_type` (default `'not_available'`)
   - Keep `food_enabled` for backward sync

2. **Replace the old Switch toggle UI** (lines 476-482) with the new Food Policy `Select` dropdown:
   - Options: Not Available, Mandatory (Included in Rent), Optional (Add-on)
   - When Mandatory or Optional is selected, show the food price input
   - Keep the food menu items and menu image upload sections visible when policy is mandatory or optional (replacing the `hostel.food_enabled` condition at line 484)

3. **Update save logic** (around line 171):
   - Sync `food_enabled` from `food_policy_type` on save: `food_enabled: hostel.food_policy_type !== 'not_available'`
   - Include `food_policy_type` in the data saved to the database
   - Update the food menu save condition from `hostel.food_enabled` to `hostel.food_policy_type !== 'not_available'`

### Summary of UI Change
The "Food Facility" collapsible section (Section 5) will show:
- A `Select` dropdown for Food Policy Type (Not Available / Mandatory / Optional)
- When Mandatory or Optional: food price input, meal menu items, and menu image upload
- When Not Available: nothing else shown

No database changes needed -- the `food_policy_type` column already exists on the `hostels` table.

