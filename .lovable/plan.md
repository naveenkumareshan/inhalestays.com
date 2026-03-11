

# Enhance Employee Details & Add Password Management

## Summary of remaining changes (keeping bank details as-is)

### 1. Admin Employee View Dialog — Add Salary & Reset Password Button
**File: `src/pages/admin/AdminEmployees.tsx`**
- Add Salary field to the view dialog (currently missing — partner employee view has it)
- Add a "Reset Password" button inside the view dialog
- Show the KeyRound action button in the table even when `employee_user_id` is missing (to allow creating login, matching partner employee behavior)
- Use the same create-login-or-reset pattern as VendorEmployees

### 2. Partner Employee View Dialog — Add Reset Password Button
**File: `src/pages/vendor/VendorEmployees.tsx`**
- Add a "Reset Password" button inside the view detail dialog so users can trigger password reset from the detail view too (not just from the table row action)

### 3. Partner Profile — Add "Change Own Password" Section
**File: `src/pages/vendor/VendorProfile.tsx`**
- Add a "Change Password" card/section below VendorProfile and WhatsAppSettings
- Uses `supabase.auth.updateUser({ password })` for self-password change
- Simple form: New Password + Confirm Password fields with a submit button

### What stays unchanged
- Bank Details tab in VendorProfile.tsx — kept as requested
- All existing employee fields and dialogs remain intact

