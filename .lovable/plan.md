

# Fix: Partner Registration Not Working

## Problem

The `partner-register` edge function exists in code but is **not configured** in `supabase/config.toml`. Without a config entry, two things happen:

1. **JWT verification is enabled by default** — since the registration endpoint is called by unauthenticated users, the request will be rejected with a 401 error.
2. The function may not be deployed at all.

## Fix

### File: `supabase/config.toml`

Add the missing function configuration:

```toml
[functions.partner-register]
verify_jwt = false
```

This is a one-line addition. Once added, the function will be deployed with JWT verification disabled, allowing unauthenticated users to register as partners.

No other code changes are needed — the `PartnerOnboard.tsx` page correctly calls `supabase.functions.invoke('partner-register', ...)` and the edge function logic itself is sound.

