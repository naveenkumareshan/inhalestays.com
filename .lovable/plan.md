

# Fix: Google & Apple OAuth 404 Error for Students

## Root Cause

Two bugs in `src/components/auth/SocialLoginButtons.tsx`:

1. **Capacitor path**: `redirectTo` is set to `/student-login` — this route does **not exist**. The correct route is `/student/login`. This causes a 404 after OAuth completes on mobile.

2. **Web path**: `redirect_uri` is hardcoded to `https://inhalestays-com.lovable.app`. If a student accesses from the preview URL or any other origin, the OAuth callback fails or redirects to the wrong domain. Should use `window.location.origin` so it works from **any** domain the student is on.

## Fix

### `src/components/auth/SocialLoginButtons.tsx`

**Capacitor branch (line 28):**
```typescript
// Before
redirectTo: 'https://inhalestays-com.lovable.app/student-login',
// After
redirectTo: 'https://inhalestays-com.lovable.app/student/login',
```

**Web branch (line 44):**
```typescript
// Before
redirect_uri: 'https://inhalestays-com.lovable.app',
// After
redirect_uri: window.location.origin,
```

This ensures OAuth works regardless of where the student accesses the app — preview URL, published URL, or native app.

### Files Changed
- `src/components/auth/SocialLoginButtons.tsx`

