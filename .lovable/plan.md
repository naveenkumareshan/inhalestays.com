

# Add "Show Food Price" Toggle for Mandatory Food

## What This Does
When food is mandatory (included in rent), the admin/partner will have a toggle to control whether the food price amount (e.g., "₹500/mo included in rent") is shown to students or hidden (just showing "Food Included").

## Changes

### 1. Database Migration
Add a new column `show_food_price` to the `hostels` table:
```sql
ALTER TABLE public.hostels ADD COLUMN show_food_price boolean NOT NULL DEFAULT true;
```
Default is `true` (price shown), so existing hostels keep current behavior.

### 2. Admin Hostel Form (`src/components/admin/HostelForm.tsx`)
Add a checkbox/switch below the food price input (visible only when policy is "mandatory") labeled **"Show food price to students"**. This controls whether the price breakdown is visible on the booking page.

### 3. Admin Hostel Editor (`src/components/admin/HostelEditor.tsx`)
Add the same toggle in the food configuration section, synced with `show_food_price` field.

### 4. Booking Page (`src/pages/HostelRoomDetails.tsx`)
In the Food Plan section (line ~853), conditionally show the price text:
- If `hostel.show_food_price` is `true`: Show "Food Included (₹500/mo included in rent)" (current behavior per the reference image)
- If `hostel.show_food_price` is `false`: Show only the "Food Included" badge without the price

Similarly update the price breakdown section to hide/show the "Included in Rent" line based on this setting.

## Files to Modify

| File | Change |
|------|--------|
| Database | Add `show_food_price` boolean column to `hostels` |
| `src/components/admin/HostelForm.tsx` | Add toggle for "Show food price to students" when policy is mandatory |
| `src/components/admin/HostelEditor.tsx` | Add same toggle, sync with hostel data |
| `src/pages/HostelRoomDetails.tsx` | Conditionally display food price based on `show_food_price` |

