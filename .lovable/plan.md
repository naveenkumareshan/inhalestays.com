

# Add InhaleStays Branded Splash Screen for Native App

## Current State
- Capacitor splash screen plugin is already configured with `launchAutoHide: false`, dark background (`#0f172a`), and a spinner
- `hideSplashScreen()` is called in `App.tsx` on mount with a 300ms delay
- No custom splash screen image exists — it just shows a dark background with a spinner

## What Needs to Change

### 1. Create a branded HTML/CSS splash screen overlay
Since Capacitor's native splash screen requires actual native image assets (which must be placed in `android/res/` and `ios/Assets.xcassets/` manually), the best approach within Lovable is to create an **in-app branded splash overlay** that displays while the app loads.

This will:
- Show the InhaleStays logo (`src/assets/inhalestays-logo.png`) centered on a dark branded background
- Display the app name "InhaleStays" with the tagline
- Include a subtle loading animation
- Fade out gracefully once the app is ready

### 2. Create `src/components/SplashOverlay.tsx`
- Full-screen fixed overlay with `z-50`, dark background matching `#0f172a`
- Centered logo image + "InhaleStays" text + "Reading Room Booking" tagline
- Fade-out animation triggered after a short delay
- Removed from DOM after animation completes

### 3. Update `src/App.tsx`
- Import and render `SplashOverlay` at the top level
- Pass a state to control visibility, hiding it after the app mounts (1.5–2 seconds)

### 4. Update `capacitor.config.ts`
- Keep existing native splash config (dark background) as a brief pre-load screen
- Increase the `hideSplashScreen` delay slightly so the branded overlay is visible before the native one hides

### 5. Copy logo to public directory
- Copy `src/assets/inhalestays-logo.png` to `public/splash-logo.png` so it's available in the built output without being hashed

## Files Changed
- **New**: `src/components/SplashOverlay.tsx`
- **Modified**: `src/App.tsx` — add splash overlay
- **Modified**: `src/utils/splashScreen.ts` — slightly longer delay for smoother transition

