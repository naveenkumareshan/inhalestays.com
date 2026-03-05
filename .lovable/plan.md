

# Fix: Partner Employee Sidebar Not Showing Permitted Items

## Problem
Two bugs prevent `vendor_employee` users from seeing their assigned sidebar items.

## Root Causes

### 1. `usePartnerPropertyTypes` queries the wrong user ID
In `src/hooks/usePartnerPropertyTypes.ts`, the hook queries `cabins.created_by = user.id` and `hostels.created_by = user.id`. For a `vendor_employee`, `user.id` is the **employee's** ID, not the partner's. Since the employee never created any properties, `hasReadingRooms` and `hasHostels` are always `false`, and all property-related sidebar sections are hidden.

**Fix**: When the user is a `vendor_employee`, use `user.vendorId` (the partner's user ID already stored from `AuthContext`) instead of `user.id`.

### 2. Section-level permission gates are too restrictive
In `src/components/admin/AdminSidebar.tsx`, the outer gate for each collapsible section checks a single specific permission, but employees may have other permissions within that section:

- **Reading Rooms section** (line 111): gated by `hasPermission('view_bookings')` — an employee with only `seats_available_map` is blocked from the entire section
- **Hostels section** (line 192): gated by `hasPermission('view_reading_rooms')` — this is a Reading Room permission, not a Hostel permission
- **Users section** (line 267): gated by `hasPermission('manage_students')` — should also allow `view_students`

**Fix**: Change section gates to `hasAnyPermission([...all relevant sub-permissions...])` so any granted sub-permission opens the section, while individual items are still filtered by `hasAccess`.

## Changes

| File | Change |
|------|--------|
| `src/hooks/usePartnerPropertyTypes.ts` | Use `user.vendorId` instead of `user.id` when role is `vendor_employee` |
| `src/components/admin/AdminSidebar.tsx` | Fix section-level permission gates to use `hasAnyPermission` with all relevant permissions for that section |

### Detailed gate fixes in AdminSidebar

```text
Reading Rooms section gate:
  Before: hasPermission('view_bookings')
  After:  hasAnyPermission(['view_bookings','seats_available_map','view_due_management','view_receipts','view_key_deposits','view_reading_rooms'])

Hostels section gate:
  Before: hasPermission('view_reading_rooms')
  After:  hasAnyPermission(['view_bed_map','view_hostel_due_management','view_hostel_bookings','view_hostel_receipts','view_hostel_deposits'])

Users section gate:
  Before: hasPermission('manage_students')
  After:  hasAnyPermission(['view_students','manage_students','view_coupons'])
```

No database or UI design changes required.

