

# Granular Action-Level Permissions for Partner Employees

## Problem
Currently, employee permissions are module-level only (e.g., `seats_available_edit` = full edit access). An employee with edit access can book, cancel, transfer, release, edit dates, and block — no granular control. Partners need feature-level toggles to prevent fraud.

## New Permission Keys

Add these action-specific permissions to the existing system:

| Permission Key | Controls |
|---|---|
| `can_create_booking` | New booking on available seat |
| `can_renew_booking` | Renew button on booked seat |
| `can_book_future` | Book Future button |
| `can_cancel_booking` | Cancel button on booking cards |
| `can_release_booking` | Release button on booking cards |
| `can_transfer_booking` | Transfer button on booking cards |
| `can_edit_booking_dates` | Edit Dates button on booking cards |
| `can_block_seat` | Block/Unblock seat |
| `can_edit_price` | Inline price edit on seats |
| `can_hostel_create_booking` | Hostel bed booking |
| `can_hostel_cancel_booking` | Hostel booking cancel |
| `can_hostel_release_booking` | Hostel booking release |
| `can_hostel_transfer_booking` | Hostel booking transfer |

## Changes

### 1. `src/hooks/useVendorEmployeePermissions.ts`
- Add all new permission keys to the `PartnerEmployeePermissions` interface and `ALL_PERMISSION_KEYS` array

### 2. `src/components/vendor/VendorEmployeeForm.tsx`
- Add a new **"Seat Actions"** permission group and **"Hostel Actions"** group under the existing groups in `PERMISSION_GROUPS`
- Each action gets its own View (unused, hidden) + Edit toggle, or simpler: just a single checkbox per action since these are action permissions, not view/edit pairs
- Approach: Add a new `actions` array alongside `modules` in the permission group, rendered as single checkboxes

### 3. `src/pages/vendor/VendorSeats.tsx`
Replace the single `canEdit` gate with granular checks:
- **Renew button** (line ~1163): `hasPermission('can_renew_booking')`
- **Book Future button** (line ~1203): `hasPermission('can_book_future')`
- **Block button** (line ~1223): `hasPermission('can_block_seat')`
- **Booking form** (line ~1316): `hasPermission('can_create_booking')` (or `can_renew_booking`/`can_book_future` when in those modes)
- **Transfer button** (line ~1913): `hasPermission('can_transfer_booking')`
- **Edit Dates button** (line ~1917): `hasPermission('can_edit_booking_dates')`
- **Release button** (line ~1921): `hasPermission('can_release_booking')`
- **Cancel button** (line ~1925): `hasPermission('can_cancel_booking')`
- **Price edit buttons** (line ~896, ~972): `hasPermission('can_edit_price')`
- **Block on hover** (line ~923): `hasPermission('can_block_seat')`
- For partners (`user?.role === 'vendor'`), all permissions remain `true` (no change needed — `buildAllTrue()` already handles this)

### 4. Employee Form UI
Add new group in `PERMISSION_GROUPS`:
```typescript
{
  group: 'Reading Room Actions',
  actions: [
    { label: 'Create Booking', key: 'can_create_booking' },
    { label: 'Renew Booking', key: 'can_renew_booking' },
    { label: 'Book Future', key: 'can_book_future' },
    { label: 'Cancel Booking', key: 'can_cancel_booking' },
    { label: 'Release Booking', key: 'can_release_booking' },
    { label: 'Transfer Booking', key: 'can_transfer_booking' },
    { label: 'Edit Booking Dates', key: 'can_edit_booking_dates' },
    { label: 'Block/Unblock Seat', key: 'can_block_seat' },
    { label: 'Edit Seat Price', key: 'can_edit_price' },
  ]
},
{
  group: 'Hostel Actions',
  actions: [
    { label: 'Create Hostel Booking', key: 'can_hostel_create_booking' },
    { label: 'Cancel Hostel Booking', key: 'can_hostel_cancel_booking' },
    { label: 'Release Hostel Booking', key: 'can_hostel_release_booking' },
    { label: 'Transfer Hostel Booking', key: 'can_hostel_transfer_booking' },
  ]
}
```

Render these as a simple checkbox grid (no view/edit split — just enabled/disabled per action).

| File | Change |
|---|---|
| `src/hooks/useVendorEmployeePermissions.ts` | Add ~13 new action permission keys |
| `src/components/vendor/VendorEmployeeForm.tsx` | Add action permission groups with checkbox UI |
| `src/pages/vendor/VendorSeats.tsx` | Replace `canEdit` with granular `hasPermission()` checks per action |

