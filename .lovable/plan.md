

# Fix: Android Emulator Showing Blank Screen

## Problem

The `capacitor.config.ts` has a `server.url` pointing to the remote Lovable preview URL. This causes the Android WebView to try loading from the internet instead of using the local bundled assets. On the emulator, this fails (blank screen, opens Chrome).

## Solution

Remove the `server` block from `capacitor.config.ts` so the app loads from the local `dist/` folder instead of a remote URL. This is the correct setup for building a standalone APK.

### `capacitor.config.ts`
- Remove the entire `server` block (lines 7-10) containing `url` and `cleartext`
- The app will then load from `webDir: 'dist'` which contains your built assets

After this change, you need to:
1. Export to GitHub and pull locally
2. Run `npm run build` to generate the `dist/` folder
3. Run `npx cap sync android`
4. Run the app again from Android Studio

The `server.url` option is only useful during development when you want hot-reload from your local dev server — it should never be used for production APK builds.

