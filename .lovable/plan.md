

## Root Cause: Wrong Capacitor Detection

The `SocialLoginButtons.tsx` checks `!!(window as any).Capacitor` to decide whether to use direct Supabase OAuth or the Lovable managed proxy. 

**The problem**: The `@capacitor/core` package (imported in `splashScreen.ts`) injects `window.Capacitor` in ALL environments — including web browsers. So `!!(window as any).Capacitor` is **always true**, even on desktop web.

This means the code **always** takes the Capacitor branch, calling `supabase.auth.signInWithOAuth()` directly (which hits Supabase's `/authorize` endpoint without managed credentials), and **never** uses `lovable.auth.signInWithOAuth()` (which proxies through Lovable's managed Google credentials).

This explains:
- Auth logs showing requests hitting Supabase `/authorize` directly with "missing OAuth secret"
- Error persisting even after enabling Google in Cloud dashboard (the managed proxy is never reached)

## Fix

In `src/components/auth/SocialLoginButtons.tsx`, replace the Capacitor detection:

```typescript
// BEFORE (broken — always true when @capacitor/core is installed)
const isCapacitor = !!(window as any).Capacitor;

// AFTER (correct — only true on actual native platforms)
const isCapacitor = !!(window as any).Capacitor?.isNativePlatform?.();
```

This single-line change ensures:
- **Web browsers** → use `lovable.auth.signInWithOAuth` (managed proxy with Google credentials)
- **Native mobile apps** → use `supabase.auth.signInWithOAuth` (direct, with explicit redirectTo)

No other files need changes.

