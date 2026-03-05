

# Fix: Partner Employee Password Reset Button Missing

## Problem
The "Reset Password" (KeyRound) button in `VendorEmployees.tsx` only renders when `emp.employee_user_id` is set (line 224). Employees created **before** the `partner-create-employee` edge function was added have no `employee_user_id`, so the button is hidden for them.

## Solution

Show the KeyRound button for **all** employees, handling two scenarios:

1. **Employee HAS `employee_user_id`**: Show "Reset Password" dialog (existing flow — calls `admin-reset-password`)
2. **Employee has NO `employee_user_id`**: Show "Create Login & Set Password" dialog that:
   - Calls `partner-create-employee` edge function to create auth account
   - Updates the `vendor_employees` record with the returned `employee_user_id`
   - Refreshes the employee list

Also handle the case where the email is already registered (409 from edge function) — in that case, look up the existing user and link them.

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/vendor/VendorEmployees.tsx` | Remove `employee_user_id` guard on KeyRound button; update `handleResetPassword` to branch based on whether `employee_user_id` exists; if not, create auth account first via edge function, update the record, then confirm |

## Technical Details

In `handleResetPassword`:
```typescript
if (!resetPasswordEmployee.employee_user_id) {
  // No auth account yet — create one
  const { data } = await supabase.functions.invoke('partner-create-employee', {
    body: { name: emp.name, email: emp.email, phone: emp.phone, password: newPassword }
  });
  if (data?.userId) {
    // Link the auth account to the vendor_employees record
    await supabase.from('vendor_employees')
      .update({ employee_user_id: data.userId })
      .eq('id', emp.id);
  }
} else {
  // Already has auth account — just reset password
  await supabase.functions.invoke('admin-reset-password', { body: { userId, newPassword } });
}
```

Dialog title changes dynamically: "Create Login" vs "Reset Password" based on whether `employee_user_id` exists.

