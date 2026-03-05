

# Fix: Google OAuth 404 Error

## Root Cause

The user accesses the app from their custom domain `https://inhalestays.com` (visible in auth logs). The `SocialLoginButtons` component sets `redirect_uri: window.location.origin`, which becomes `https://inhalestays.com`. The Lovable Cloud OAuth callback (`/~oauth`) only works on the `*.lovable.app` domain, so the redirect back to the custom domain hits a 404.

## Fix

**`src/components/auth/SocialLoginButtons.tsx`**:
- Change the `redirect_uri` to always use the lovable.app published URL (`https://inhalestays-com.lovable.app`) for the OAuth callback, since the `/~oauth` handler is only available there.
- After OAuth completes on the lovable.app domain, the session will be established via Supabase which works across domains.

```typescript
const LOVABLE_APP_URL = 'https://inhalestays-com.lovable.app';

const result = await lovable.auth.signInWithOAuth(provider, {
  redirect_uri: LOVABLE_APP_URL,
});
```

- Also update the Capacitor branch redirect to match (already correct: `https://inhalestays-com.lovable.app/student-login`).

**`src/pages/StudentLogin.tsx`**:
- The existing `getSession()` check on mount already handles detecting the session after redirect — no changes needed here.

### Files to Change

| File | Change |
|------|--------|
| `src/components/auth/SocialLoginButtons.tsx` | Set `redirect_uri` to the lovable.app URL instead of `window.location.origin` |

