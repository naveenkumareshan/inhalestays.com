

# Partner Native App — Separate Build from Same Codebase

## Overview
Create a partner-specific mobile app ("InhaleStays Partner") that builds from the same codebase but ships as a separate APK/IPA with its own app ID, bottom navigation, and partner-focused layout. The partner routes (`/partner/*`) already exist — they just need a mobile-optimized wrapper.

## What Gets Built

### 1. Partner Mobile Layout (`src/components/partner/PartnerMobileLayout.tsx`)
- Same structure as `MobileAppLayout` — full-screen with bottom nav and safe-area padding
- Uses a new `PartnerBottomNav` instead of the student one

### 2. Partner Bottom Navigation (`src/components/partner/PartnerBottomNav.tsx`)
- 5 tabs: **Dashboard**, **Bookings**, **Properties**, **Earnings**, **Profile**
- Routes to `/partner/dashboard`, `/partner/bookings`, `/partner/manage-properties`, `/partner/earnings`, `/partner/profile`
- Same visual style as student bottom nav (active indicator bar, icons, etc.)

### 3. Route Changes in `App.tsx`
- Wrap `/partner` routes inside the new `PartnerMobileLayout` (replacing `AdminLayout`) when accessed on mobile
- Keep desktop sidebar layout for large screens using a responsive wrapper that switches between `AdminLayout` and `PartnerMobileLayout` based on viewport
- Partner login/register/onboard routes stay outside the layout (same as student auth pages)

### 4. Capacitor Config for Partner App
- Create `capacitor.partner.config.ts` with:
  - `appId: 'com.inhalestays.partner'`
  - `appName: 'InhaleStays Partner'`
  - Server URL pointing to `/partner/login` as entry
- User builds the partner app by running: `npx cap sync --config capacitor.partner.config.ts`

### 5. Partner Splash & Assets
- Reuse the existing splash logo and icons (can be customized later)
- Entry point for partner app opens `/partner/login` instead of `/`

## Files to Create/Modify
1. **Create** `src/components/partner/PartnerBottomNav.tsx`
2. **Create** `src/components/partner/PartnerMobileLayout.tsx`
3. **Create** `capacitor.partner.config.ts`
4. **Modify** `src/App.tsx` — wrap partner routes in responsive layout switcher
5. **Modify** `src/components/AdminLayout.tsx` — detect mobile + partner role to show mobile layout

## Build Instructions for User
After implementation, to build the partner app separately:
1. Export to GitHub, pull locally
2. `npm install && npm run build`
3. `npx cap add android --config capacitor.partner.config.ts`
4. `npx cap sync --config capacitor.partner.config.ts`
5. `npx cap run android --config capacitor.partner.config.ts`

The student app continues using the existing `capacitor.config.ts`.

