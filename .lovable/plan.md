

# Three Fixes: Remove Lovable Badge, Fix Google Auth Branding, Enable Auto-Confirm Signups

## 1. Remove "Edit with Lovable" Button

The script at line 45 in `index.html` loads the Lovable badge/button:
```
<script src="https://cdn.gpteng.co/gptengineer.js" type="module"></script>
```

**However**, this line has a comment saying "DO NOT REMOVE THIS SCRIPT TAG". The proper way to hide the badge is through project settings:
- Go to **Settings** (gear icon) and toggle **"Hide 'Lovable' Badge"** to ON.

This is a built-in setting -- no code changes needed.

## 2. Fix Google Auth Showing "Lovable" Authorization Page

Currently the Google OAuth uses the Lovable-managed credentials, which shows "Lovable" branding on the consent screen. The `redirect_uri` in `SocialLoginButtons.tsx` points to `window.location.origin + '/student/login'`.

**Fix**: Change the `redirect_uri` to just `window.location.origin` (no path suffix). The OAuth flow will handle the redirect properly via the auth state listener already in place on the login page. This ensures the consent/authorization screen works cleanly.

However, to fully remove the "Lovable" branding from the Google consent screen, you would need to configure your own Google OAuth credentials (your own Google Cloud project). This is done via the Lovable Cloud Authentication Settings (Users tab > Authentication Settings > Google). The current managed credentials will always show "Lovable" as the app name.

**File to modify**: `src/components/auth/SocialLoginButtons.tsx`
- Change `redirect_uri` from `window.location.origin + '/student/login'` to `window.location.origin`

## 3. Enable Auto-Confirm Email Signups (Skip Email Verification)

Currently, after signup, users must verify their email before they can log in (Supabase default). The user wants customers to log in immediately after registration without email verification, and optionally verify later from their profile.

**Changes needed**:

### A. Enable auto-confirm in auth config
Use the configure-auth tool to enable `autoconfirm` for email signups. This lets users sign in immediately after registration.

### B. Update `AuthContext.tsx` login function
Remove the `Email not confirmed` error handling block (lines 117-119) since it will no longer occur.

### C. Update `StudentRegister.tsx` success message
Change the toast from "Please check your email to verify your account before logging in" to "Your account has been created successfully! You can now log in."

### D. Add email verification option to Profile page
In `ProfileManagement.tsx`, add a small section that shows an "Unverified" badge next to the email and a "Verify Email" button that triggers `supabase.auth.resend()` to send a verification email. This gives users the option to verify later from their profile.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/auth/SocialLoginButtons.tsx` | Fix `redirect_uri` to `window.location.origin` |
| `src/contexts/AuthContext.tsx` | Remove "Email not confirmed" error block |
| `src/pages/StudentRegister.tsx` | Update success toast message |
| `src/components/profile/ProfileManagement.tsx` | Add email verification badge + "Verify Email" button |

## Technical Details

- Auto-confirm is enabled via the configure-auth tool (no SQL migration needed)
- Email verification status is available from `supabase.auth.getUser()` via `user.email_confirmed_at`
- The "Verify Email" button calls `supabase.auth.resend({ type: 'signup', email })` to send the confirmation link
- The Lovable badge removal is a project setting, not a code change

