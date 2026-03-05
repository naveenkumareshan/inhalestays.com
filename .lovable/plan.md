

# Fix: Blank Screen on Page Refresh (SPA Fallback)

## Problem
When refreshing or directly accessing a nested route (e.g., `/admin/dashboard`, `/partner/bookings`), the server returns a 404 instead of serving `index.html`, causing a blank screen. This is a classic SPA routing issue.

## Root Cause
Two issues:
1. **`base: './'`** in `vite.config.ts` — relative base paths break asset resolution on nested routes (e.g., refreshing `/admin/dashboard` makes the browser look for assets at `/admin/assets/...` instead of `/assets/...`). This must be `'/'`.
2. **No SPA fallback rewrite** — Lovable's hosting needs a `_redirects` file (Netlify-style) to serve `index.html` for all non-file routes.

## Changes

| File | Change |
|------|--------|
| `vite.config.ts` | Change `base: './'` to `base: '/'` |
| `public/_redirects` | Create with `/* /index.html 200` rewrite rule |

These are config-only changes. No UI modifications.

