

# Table-Style Weekly Food Menu View

## What Changes
Replace the current tab-based food menu layout with a clean **weekly table view** (like the reference image) -- rows for each day (Sun-Sat), columns for Breakfast, Lunch, and Dinner. This applies to both the student modal and the admin editor.

## Student View (`FoodMenuModal.tsx`)
- Remove the day tabs layout entirely
- Replace with a table: **Day | Breakfast (7-9 AM) | Lunch (12-2 PM) | Dinner (7-9 PM)**
- Each row shows one day (Sun through Sat) with comma-separated items per meal
- Highlight today's row with a subtle background color so students can quickly spot it
- Keep the menu image display and empty state messaging
- Widen the modal to `max-w-2xl` to fit the table comfortably

## Admin View (`HostelEditor.tsx` food menu section)
- Add a **read-only preview table** above the editing area showing the full weekly menu at a glance (same table format as student view)
- Keep the existing day-selector + add/remove item editing UI below the table for data entry
- This gives admins a quick overview while still having granular editing per day

## Technical Details

| File | Change |
|------|--------|
| `src/components/hostels/FoodMenuModal.tsx` | Replace tabs with a weekly table layout. Group all items by day and meal type into rows. Highlight current day row. |
| `src/components/admin/HostelEditor.tsx` | Add a weekly overview table (read-only) above the existing day-wise editing controls in the food menu section. |

No database changes needed -- the existing `hostel_food_menu` table with `day_of_week` and `meal_type` columns already supports this structure.

