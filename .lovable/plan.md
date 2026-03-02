

# Reset Admin Password

## Problem
You're logged out and need your admin password reset to `Naveen1*`. The existing `admin-reset-password` edge function requires admin authentication, which you can't provide since you're locked out.

## Solution
Create a temporary edge function `one-time-password-reset` that uses the service role key to reset the password without requiring authentication. After successful reset, the function will be deleted.

### Steps

1. **Create temporary edge function** `one-time-password-reset/index.ts`
   - Hardcoded to only work for user ID `8a0ee35f-90a4-4657-bda3-d53f07eebb03`
   - Uses service role key to call `auth.admin.updateUserById`
   - Sets password to `Naveen1*`
   - No auth required (one-time use)

2. **Deploy and call the function** to reset the password

3. **Delete the temporary function** immediately after use

4. **You log in** at `/admin/login` with:
   - Email: `admin@inhalestays.com`
   - Password: `Naveen1*`

---

### Security Note
The temporary function is hardcoded to a single user ID and will be deleted right after use, so there is no security risk.

