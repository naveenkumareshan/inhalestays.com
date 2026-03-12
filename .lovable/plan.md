

# Split Booking Toggle into "Online Booking" + "Partner Visibility" for All Properties

## Problem
Currently there's a single `is_booking_active` toggle on property cards, which is confusing. Partners need two separate controls:
1. **Student Online Booking** (on/off) — controls whether students can book online
2. **Partner-side Visibility** (on/off) — controls whether the property appears in partner's seat map, bed map, and operational views

## Database Changes
Add a new column `is_partner_visible` (boolean, default true) to three tables:
- `cabins`
- `hostels`
- `mess_partners`

This column controls whether the property appears in partner operational views (seat maps, bed maps). The existing `is_booking_active` column will be relabeled as "Online Booking" (student-side).

```sql
ALTER TABLE public.cabins ADD COLUMN is_partner_visible boolean NOT NULL DEFAULT true;
ALTER TABLE public.hostels ADD COLUMN is_partner_visible boolean NOT NULL DEFAULT true;
ALTER TABLE public.mess_partners ADD COLUMN is_partner_visible boolean NOT NULL DEFAULT true;
```

## UI Changes — Property Cards

### CabinItem, HostelItem, MessItem
Replace the single "Booking On/Off" badge and button with two indicators and two toggle buttons:

**Badges (meta row):**
- `● Online On` / `● Online Off` (green/red) — based on `is_booking_active`
- `● Visible` / `● Hidden` (blue/gray) — based on `is_partner_visible`

**Buttons (actions row):**
- "Online On/Off" button — toggles `is_booking_active` (student online booking)
- "Show/Hide" button — toggles `is_partner_visible` (partner operational visibility)
- Both available to admin and partner roles

### Logic: When deactivating a property (`is_active = false`), also set both `is_booking_active = false` AND `is_partner_visible = false`.

## Service Layer Changes

### `src/api/adminRoomsService.ts`
- `toggleRoomActive`: When deactivating, also set `is_partner_visible: false`
- Add `togglePartnerVisible(id, isVisible)` method

### `src/api/hostelService.ts`
- `toggleHostelActive`: When deactivating, also set `is_partner_visible: false`
- Add `toggleHostelPartnerVisible(id, isVisible)` method

### `src/pages/admin/MessManagement.tsx`
- `handleToggleActive`: When deactivating, also set `is_partner_visible: false`
- Add `handleTogglePartnerVisible` handler

## Management Pages

### `src/pages/RoomManagement.tsx`
- Map `is_partner_visible` to cabin data
- Add `onTogglePartnerVisible` handler calling new service method
- Pass to CabinItem

### Hostel management (via `hostelService`)
- Same pattern

### `src/pages/admin/MessManagement.tsx`
- Add toggle handler for `is_partner_visible`

## Files Modified
- **Migration**: Add `is_partner_visible` column to 3 tables
- `src/components/admin/CabinItem.tsx` — dual badges + dual toggle buttons
- `src/components/admin/HostelItem.tsx` — dual badges + dual toggle buttons
- `src/components/admin/MessItem.tsx` — dual badges + dual toggle buttons
- `src/api/adminRoomsService.ts` — add `togglePartnerVisible`, update `toggleRoomActive`
- `src/api/hostelService.ts` — add `toggleHostelPartnerVisible`, update `toggleHostelActive`
- `src/pages/RoomManagement.tsx` — map new field, add handler, pass prop
- `src/pages/admin/MessManagement.tsx` — add handler, pass prop

