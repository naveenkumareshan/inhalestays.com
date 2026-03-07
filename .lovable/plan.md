

# Add Finance Permissions to Admin & Partner Employee Forms

## Problem
The Finance sidebar section (Reconciliation, Banks) is visible to all employees without any permission gating. Need to add Finance permissions to both admin and partner employee forms, and gate sidebar items accordingly.

## Changes

### 1. `src/hooks/useVendorEmployeePermissions.ts`
Add 4 new keys to `PartnerEmployeePermissions` interface and `ALL_PERMISSION_KEYS`:
- `view_reconciliation`, `manage_reconciliation`
- `view_banks`, `manage_banks`

### 2. `src/components/vendor/VendorEmployeeForm.tsx`
Add a **Finance** group to `PERMISSION_GROUPS` (before "Management"):
```
{ group: 'Finance', modules: [
  { label: 'Reconciliation', viewKey: 'view_reconciliation', editKey: 'manage_reconciliation' },
  { label: 'Banks', viewKey: 'view_banks', editKey: 'manage_banks' },
]}
```

### 3. `src/components/admin/AdminEmployeeForm.tsx`
Add a **Finance** group to `PERMISSION_GROUPS` (before "Other"):
```
{ group: 'Finance', modules: [
  { label: 'Reconciliation', viewKey: 'view_reconciliation', editKey: 'manage_reconciliation' },
  { label: 'Banks', viewKey: 'view_banks', editKey: 'manage_banks' },
]}
```

### 4. `src/components/admin/AdminSidebar.tsx`
Gate Finance sub-items with permission checks. Change the Finance section from a plain `push` to conditional logic:
- Reconciliation: show if `user.role === 'admin' || user.role === 'vendor' || hasPermission('view_reconciliation')`
- Banks: show if `user.role === 'admin' || user.role === 'vendor' || hasPermission('view_banks')`
- Only push the Finance group if at least one sub-item is visible.

### Files
- **Edit**: `src/hooks/useVendorEmployeePermissions.ts` — add 4 permission keys
- **Edit**: `src/components/vendor/VendorEmployeeForm.tsx` — add Finance permission group
- **Edit**: `src/components/admin/AdminEmployeeForm.tsx` — add Finance permission group
- **Edit**: `src/components/admin/AdminSidebar.tsx` — gate Finance items by permission

