

## Redesign "Manage Laundry" Page to Match Mess Pattern

The current `/admin/laundry` (AdminLaundry.tsx) uses raw table tabs (Orders, Items, Partners, Slots) — nothing like the Mess management pattern. It needs a complete redesign.

### What the Mess Pattern Looks Like
- **Header**: "Manage Mess Places" with count badge + "Add Mess" button
- **Search bar** for filtering
- **Property cards** in a responsive grid (MessItem cards with image, name, status, toggles, action buttons)
- **AdminTablePagination** at bottom
- Clicking Edit opens a full-page editor (MessEditor)
- Packages managed via dialog per property

### Plan

**1. Create `LaundryItem.tsx`** — property card component (mirrors MessItem)
- Shows: business name, serial number, contact person, phone, service area, delivery time, operating hours
- Status badges: Active/Inactive, Approved/Pending
- Action row: Edit, Items (count badge), Slots (count badge), toggles (Activate, Online Booking)
- No image for now (laundry properties don't typically have images)

**2. Create `LaundryEditor.tsx`** — full-page creation/edit form (mirrors MessEditor)
- All laundry_partners fields: business_name, description, contact_person, phone, email, address, city, state, service_area, delivery_time_hours, operating_hours
- For partners: pre-fills `user_id` from current user
- For admin: includes a user selector (or user_id input)
- Save creates/updates via `laundryCloudService`

**3. Rewrite `AdminLaundry.tsx`** — property list page (mirrors MessManagement)
- Header: "Manage Laundry" with count badge + "Add Laundry" button
- Search bar filtering by name/serial_number/service_area
- Grid of LaundryItem cards
- AdminTablePagination
- Clicking Edit → shows LaundryEditor (full-page, same as Mess)
- "Items" button → dialog showing item CRUD for that partner
- "Slots" button → dialog showing slot CRUD for that partner
- Remove the Orders tab entirely (separate page exists at `/admin/laundry-orders` or `/partner/laundry-orders`)
- Remove the Partners tab (partners ARE the property cards now)
- Admin sees ALL laundry partners; partner/employee sees only their own

**4. Update routes** — `/partner/laundry-orders` should render a dedicated LaundryOrders page (or reuse the orders tab as standalone). Currently both `/partner/laundry` and `/partner/laundry-orders` render `LaundryPartnerDashboard`. Split them:
- `/partner/laundry` → `AdminLaundry` (same component, scoped by role)
- `/partner/laundry-orders` → keep separate orders view

**5. Update `LaundryPartnerDashboard.tsx`** — This becomes the creation-only flow (when partner has no laundry property). Once created, redirect to the main Manage Laundry page. Remove the tabs (Details, Items, Slots, Orders) since those are now handled by AdminLaundry + dialogs.

### Files to Create/Modify

| File | Changes |
|------|---------|
| `src/components/admin/LaundryItem.tsx` | **New** — property card matching MessItem pattern |
| `src/components/admin/LaundryEditor.tsx` | **New** — full-page property editor matching MessEditor |
| `src/pages/admin/AdminLaundry.tsx` | **Rewrite** — property grid with search, pagination, item/slot dialogs |
| `src/pages/admin/LaundryOrders.tsx` | **New** — extract Orders tab as standalone page |
| `src/App.tsx` | Update `/partner/laundry-orders` route to `LaundryOrders` |

