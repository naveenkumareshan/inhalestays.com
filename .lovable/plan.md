

# Fix: Admin User Creation from Create User Form

## Investigation Summary
- The `admin-create-user` edge function works correctly (verified by direct testing)
- The `CreateStudentForm` correctly calls `admin-create-user` for admin role with password
- The edge function has `verify_jwt = false` in config.toml

## Likely Issues Found

### 1. `create-student` missing `verify_jwt = false`
The `create-student` edge function is NOT listed in `config.toml` with `verify_jwt = false`. With signing-keys, the default `verify_jwt = true` causes gateway-level JWT failures. This means **student creation is broken too**, though the user only reported admin.

### 2. Error swallowing in `extractErrorMessage`
When the edge function returns an HTTP error (e.g., 409 duplicate email), the `FunctionsHttpError` handler tries to parse JSON from `error.context.json()`. If this fails, a generic message is shown instead of the real error.

### 3. Console logging for debugging
Add `console.error` before the toast to capture exact error details for future debugging.

## Plan

### File 1: `supabase/config.toml`
- Add `[functions.create-student]` with `verify_jwt = false` (fixes student creation)

### File 2: `src/components/admin/CreateStudentForm.tsx`
- Add `console.error` logging in the catch block to capture exact errors
- Improve error extraction to handle edge cases better
- After creating admin user, show a success toast with the login URL

### File 3: `supabase/functions/create-student/index.ts` (no changes needed, already validates auth internally)

This is a minimal fix — the core admin creation logic works; the issue is most likely duplicate emails or transient errors that get swallowed.

