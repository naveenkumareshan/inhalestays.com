

# Fix: Partner Login 404 + Dual Registration Support

## Issue 1: Partner Login shows 404

**Root Cause:** `VendorLogin` is lazy-loaded (line 33 of App.tsx) but rendered **without a `<Suspense>` wrapper** at line 261:

```tsx
// Line 261 — missing Suspense
<Route path="/partner/login" element={<VendorLogin />} />
```

React throws an error when a lazy component renders without Suspense, which triggers the catch-all `*` route → 404 page.

**Fix:** Wrap `VendorLogin` in `<Suspense>` on all partner/vendor/host login routes (lines 261, 265, 267).

## Issue 2: Allow users to register as both student and partner

Currently, the `partner-register` edge function rejects users whose email is already registered (`"already been registered"` error). An existing student cannot become a partner.

**Fix — update the `partner-register` edge function:**
1. When the email already exists, look up the existing user instead of failing
2. Add the `vendor` role to their `user_roles` (if not already present)
3. Create the partner record linked to the existing user
4. Return success so the user can login via `/partner/login`

This way a student can register as a partner without creating a duplicate account — they keep their existing login credentials and gain the vendor role.

## Files Changed

| File | Change |
|------|--------|
| `src/App.tsx` (lines 261, 265, 267) | Wrap lazy `VendorLogin` in `<Suspense>` |
| `supabase/functions/partner-register/index.ts` | Handle existing users: add vendor role + create partner record instead of rejecting |

