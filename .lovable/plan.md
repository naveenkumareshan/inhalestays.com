

# Add Forgot Password for Admin Login

## Overview
Enable the "Forgot Password" flow on the admin login page so admins can reset their password via email verification -- reusing the existing Supabase-powered reset mechanism.

## What Already Exists
- A `ForgotPassword` page at `/student/forgot-password` that calls `supabase.auth.resetPasswordForEmail` -- this works for ANY user, including admins.
- A `ResetPassword` page at `/reset-password` that handles the actual password update.
- The admin login page (`AdminLogin.tsx`) has a commented-out "Forgot password?" link (lines 102-106).

## Changes

### 1. Create an Admin Forgot Password page
Create `src/pages/AdminForgotPassword.tsx` -- a copy of the existing `ForgotPassword` page with two differences:
- The "Return to Login" link points to `/admin/login` instead of `/student/login`
- Title/description styled to match the admin context

### 2. Add route in App.tsx
Add a new route: `/admin/forgot-password` pointing to the new `AdminForgotPassword` component.

### 3. Uncomment and update the link in AdminLogin.tsx
Uncomment the "Forgot password?" link (lines 102-106) and point it to `/admin/forgot-password`.

## Technical Details

| File | Change |
|------|--------|
| `src/pages/AdminForgotPassword.tsx` | New file -- reuses `supabase.auth.resetPasswordForEmail` with redirect to `/reset-password`, "Return to Login" links to `/admin/login` |
| `src/App.tsx` | Add route `<Route path="/admin/forgot-password" element={<AdminForgotPassword />} />` |
| `src/pages/AdminLogin.tsx` | Uncomment the forgot password link, change it to `/admin/forgot-password` |

No database or backend changes needed -- the existing Supabase password reset email flow works for all users regardless of role.

