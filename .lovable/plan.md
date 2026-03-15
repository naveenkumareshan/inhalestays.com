

## Phase 2 Completion: Laundry Management Enhancements

This covers 4 requests: (1) LaundryEditor enhancements, (2) Remove commission from editor, (3) PropertyApprovals & VendorApproval updates for Mess/Laundry, (4) New Laundry Operations page.

---

### 1. Database Migration

Add missing columns to `laundry_partners`:
- `whatsapp_number TEXT`
- `whatsapp_chat_enabled BOOLEAN DEFAULT false`
- `is_booking_active BOOLEAN DEFAULT false`
- `is_partner_visible BOOLEAN DEFAULT true`
- `is_student_visible BOOLEAN DEFAULT true`
- `is_approved BOOLEAN DEFAULT false`

These mirror the same toggles that exist on `cabins`, `hostels`, and `mess_partners`.

---

### 2. LaundryEditor Enhancements

**`src/components/admin/LaundryEditor.tsx`**:
- Remove `commission_percentage` field (commission will be managed at Partner Approvals level, not during property creation)
- Add **Latitude/Longitude** fields with a "Capture Location" button (uses `navigator.geolocation.getCurrentPosition`)
- Add **WhatsApp** section: number input + enable toggle (same pattern as `WhatsAppPropertyDialog`)
- Keep all existing fields

---

### 3. LaundryItem Card — WhatsApp Badge

**`src/components/admin/LaundryItem.tsx`**:
- Add WhatsApp badge row (same as MessItem/HostelItem pattern) showing enabled/disabled status
- Add WhatsApp click count display
- Add `onWhatsAppConfig` prop for opening WhatsApp settings dialog

**`src/pages/admin/AdminLaundry.tsx`**:
- Add WhatsApp config dialog integration using existing `WhatsAppPropertyDialog` component
- Update `WhatsAppPropertyDialog` to support `propertyType: 'laundry'` (map to `laundry_partners` table)

---

### 4. PropertyApprovals — Add Mess & Laundry

**`src/pages/admin/PropertyApprovals.tsx`**:
Currently only fetches `cabins` (Reading Room) and `hostels`. Update to also fetch:
- `mess_partners` → type 'Mess', with `is_approved` field, commission handling
- `laundry_partners` → type 'Laundry', with `is_approved` field, commission handling

Changes:
- Update `PropertyItem` interface to include `'Mess' | 'Laundry'` types
- Add fetching of `mess_partners` and `laundry_partners` with partner name resolution
- Add tab triggers for Mess and Laundry with counts
- Update `handleAction` to handle approval/rejection for all 4 property types (update `is_approved` + `commission_percentage` on the respective tables)
- Add type-specific badges (UtensilsCrossed for Mess, Shirt for Laundry)
- Add stat cards for pending Mess and Laundry counts

---

### 5. VendorApproval (Partner Management) — Add Mess & Laundry Properties

**`src/components/admin/VendorApproval.tsx`**:
Currently the expandable property table only shows Reading Rooms and Hostels. Update to also show:
- Mess properties (from `mess_partners` table where `user_id` matches)
- Laundry properties (from `laundry_partners` table where `user_id` matches)

Changes:
- Update `PropertyInfo` interface to include `'Mess' | 'Laundry'` types
- Fetch `mess_partners` and `laundry_partners` in `fetchProperties`
- Add Mess/Laundry count pills in `getPropertyCountPills`
- Add Mess/Laundry type badges
- Add rows in the expanded property table for mess and laundry entries
- For Mess: show subscription count instead of seats/beds
- For Laundry: show order count instead of seats/beds

---

### 6. New Laundry Operations Page

**`src/pages/admin/LaundryOperations.tsx`** (New):
A partner-facing operations dashboard for managing day-to-day pickup/delivery workflows.

Sections:
- **Summary Cards**: Today's pickups, today's deliveries, pending orders, active orders count
- **Pickup Schedule Tab**: Table of orders with `pickup_scheduled` / `confirmed` status, showing student name, items, pickup time, OTP verification button
- **Delivery Schedule Tab**: Table of orders with `ready` / `out_for_delivery` status, showing delivery details, OTP verification
- **All Orders Tab**: Full order list with status filters (reuses existing order table pattern)

Each row has:
- Student name, phone, serial number
- Item count, total amount
- Status badge with color coding
- OTP verify button (pickup/delivery) using `partnerVerifyOtp`
- Status update dropdown

**Sidebar update** (`AdminSidebar.tsx`):
- Add "Laundry Operations" sub-item under Laundry section: `${routePrefix}/laundry-operations`

**Route update** (`App.tsx`):
- Add route for `/admin/laundry-operations` and `/partner/laundry-operations` → `LaundryOperations`

---

### 7. ManageProperties Update

**`src/pages/partner/ManageProperties.tsx`**:
- Laundry tab currently renders `LaundryPartnerDashboard`. Change to render `AdminLaundry` instead (same as how Mess tab renders `MessManagement`), so partners get the same card-based management UI.

---

### Files to Create/Modify

| File | Action |
|------|--------|
| Database migration | Add columns to `laundry_partners` |
| `src/components/admin/LaundryEditor.tsx` | Remove commission, add lat/lng capture, add WhatsApp fields |
| `src/components/admin/LaundryItem.tsx` | Add WhatsApp badge, click count |
| `src/components/admin/WhatsAppPropertyDialog.tsx` | Add `'laundry'` to propertyType union, map to `laundry_partners` |
| `src/pages/admin/AdminLaundry.tsx` | Add WhatsApp dialog integration |
| `src/pages/admin/PropertyApprovals.tsx` | Add Mess & Laundry fetching, tabs, approval actions |
| `src/components/admin/VendorApproval.tsx` | Add Mess & Laundry in expandable property table |
| `src/pages/admin/LaundryOperations.tsx` | **New** — Operations dashboard |
| `src/components/admin/AdminSidebar.tsx` | Add Laundry Operations sub-item |
| `src/App.tsx` | Add laundry-operations route |
| `src/pages/partner/ManageProperties.tsx` | Switch laundry tab to AdminLaundry |

