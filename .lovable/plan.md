

# Day-Wise Food Menu System

## What This Does
Upgrade the food menu from a simple meal-type list (Breakfast/Lunch/Dinner) to a **day-wise schedule** (Sunday through Saturday), where each day has its own Breakfast, Lunch, and Dinner items. Both the student-facing modal and the admin editor will use this new pattern.

## Changes

### 1. Database Migration
Add a `day_of_week` column to the existing `hostel_food_menu` table:
```sql
ALTER TABLE public.hostel_food_menu 
ADD COLUMN day_of_week text NOT NULL DEFAULT 'monday';
```
This allows each menu item to be tagged to a specific day (sunday, monday, tuesday, wednesday, thursday, friday, saturday).

### 2. Student View: `FoodMenuModal` (`src/components/hostels/FoodMenuModal.tsx`)
Complete redesign of the modal:
- **Top tabs**: Show days of the week (Sun, Mon, Tue, Wed, Thu, Fri, Sat) as selectable tabs -- default to current day
- **Below tabs**: Show Breakfast, Lunch, Dinner sections with food items for the selected day
- Keep the menu image display if available
- Show "No items for this day" if a day has no entries

### 3. Admin Editor: `HostelEditor.tsx` (Food Menu Section, lines ~521-546)
Redesign the food menu editing section:
- Add a day selector (tabs or dropdown) at the top: Sunday through Saturday
- For the selected day, show the existing Breakfast/Lunch/Dinner item management (add/remove items)
- Update the state structure from `Record<string, string[]>` to `Record<string, Record<string, string[]>>` (day -> meal_type -> items)
- Update save logic to include `day_of_week` in each insert
- Update fetch logic to group by day then meal type
- Add a "Copy to all days" convenience button so admins can quickly replicate one day's menu to all other days

### 4. Save/Fetch Logic Updates (`HostelEditor.tsx`)
- **Fetch** (line ~104): Group fetched items by `day_of_week` then `meal_type`
- **Save** (line ~178): Include `day_of_week` field in each menu insert record
- Delete and re-insert pattern stays the same

## Technical Details

| File | Change |
|------|--------|
| Database | Add `day_of_week` text column to `hostel_food_menu` |
| `src/components/hostels/FoodMenuModal.tsx` | Redesign with day tabs, grouped by meal type per day |
| `src/components/admin/HostelEditor.tsx` | Add day selector in food menu section, update state/save/fetch for day-wise data |

