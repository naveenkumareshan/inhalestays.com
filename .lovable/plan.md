

# Link Cash Payment Modes to Employees for Exclusive Access

## Overview
Add an `assigned_employee_id` column to `partner_payment_modes` so cash entries can be linked to a specific employee (or the partner). When collecting offline payments, the `PaymentMethodSelector` filters cash modes — showing only the one assigned to the current logged-in user.

## Database Change

```sql
ALTER TABLE public.partner_payment_modes 
ADD COLUMN assigned_employee_id uuid REFERENCES public.vendor_employees(id) ON DELETE SET NULL;
```

## Changes

### 1. `src/components/vendor/PaymentModesManager.tsx`
- In the **Cash** tab, add an "Assign To" dropdown populated with:
  - **Partner (self)** — stores a special value like `partner` or the partner's user ID
  - All active employees from `vendor_employees` where `partner_user_id = partnerId`
- On insert, store the selected employee's `vendor_employees.id` (or `null` for the partner) in `assigned_employee_id`
- In the cash listing, show a badge with the assigned person's name
- Fetch employees once on mount for the dropdown

### 2. `src/components/vendor/PaymentMethodSelector.tsx`
- Extend the query to also select `assigned_employee_id`
- After fetching modes, filter cash modes:
  - If current user is the partner (`user.role === 'vendor'`): show cash modes where `assigned_employee_id IS NULL` (assigned to partner)
  - If current user is an employee (`user.role === 'vendor_employee'`): find their `vendor_employees.id` and only show cash modes where `assigned_employee_id` matches
- Bank and UPI modes remain visible to everyone (no filtering)

### 3. Minor: `PaymentModesManager` interface
- Add `assigned_employee_id: string | null` to the `PaymentMode` interface

### Files
- **Migration**: Add `assigned_employee_id` column to `partner_payment_modes`
- **Edit**: `src/components/vendor/PaymentModesManager.tsx` — employee dropdown for cash, display badge
- **Edit**: `src/components/vendor/PaymentMethodSelector.tsx` — filter cash modes by current user

