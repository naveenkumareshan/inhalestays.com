

# Fix Capacitor Native App: Blank Screen & Lovable Redirect

## Root Cause

Two issues are causing the blank screen and the redirect to lovable.dev/login:

### Issue 1: Missing `base` path in Vite config
When Capacitor loads the app from local files (`capacitor://` protocol), asset URLs must be **relative** (e.g., `./assets/index.js`), not absolute (`/assets/index.js`). Vite defaults to `/` which breaks in the Capacitor WebView.

### Issue 2: Stale Android project config
The `android/` directory still contains the old `server.url` pointing to the Lovable preview URL. Running `npx cap sync` alone does not always overwrite the native config. The Android project must be fully removed and recreated.

---

## Changes

### 1. Update `vite.config.ts` — add `base: './'`

Add `base: './'` to the Vite config so all built assets use relative paths, compatible with Capacitor's local file loading.

### 2. User must rebuild locally

After exporting the updated code, the user needs to:
```
rm -rf android
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

This ensures the old cached config is completely removed and replaced with the correct one.

---

## Technical Details

**File: `vite.config.ts`**
- Add `base: './'` at the top level of the config object, right after the `server` block

This single line change ensures that all `<script>` and `<link>` tags in the built `index.html` reference assets with relative paths (`./assets/...`) instead of absolute paths (`/assets/...`), which is required for Capacitor's `capacitor://localhost/` origin.

