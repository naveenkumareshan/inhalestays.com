

# Speed Up Partner App Loading

## Root Causes Identified
1. **SplashOverlay blocks for 2.1 seconds** — fixed 1500ms wait + 600ms fade, plus a DB call for branding on every app load
2. **usePartnerPropertyTypes makes 4 DB calls** on every mount (cabins, hostels, laundry, mess) without caching — remounts on every route change
3. **Auth `setTimeout` wrapper** in `onAuthStateChange` adds unnecessary async tick delay
4. **Triple lazy-loading chain**: `PartnerResponsiveLayout` → `PartnerMobileLayout`/`AdminLayout` → page component, each with its own Suspense

## Changes (no feature changes, only speed)

### 1. Reduce SplashOverlay timers + cache branding locally
**File**: `src/components/SplashOverlay.tsx`
- Reduce timers: 800ms start fade, 1200ms remove (was 1500/2100)
- Cache branding (name, logo, tagline) in `localStorage` so first paint uses cached values and DB fetch updates silently
- Show cached values immediately, no visual flicker

### 2. Convert `usePartnerPropertyTypes` to React Query
**File**: `src/hooks/usePartnerPropertyTypes.ts`
- Wrap in `useQuery` with `staleTime: 5min` so it caches across route changes
- Currently re-fetches 4 tables on every component mount/navigation — this is the biggest source of repeated slowness

### 3. Convert `usePartnerNavPreferences` query to have longer staleTime
**File**: `src/hooks/usePartnerNavPreferences.ts`  
- Already uses React Query but verify staleTime is sufficient (currently inherits 5min default — good, no change needed)

### 4. Remove `setTimeout` wrapper in AuthContext
**File**: `src/contexts/AuthContext.tsx`
- The `setTimeout(async () => { ... }, 0)` in `onAuthStateChange` was added to avoid Supabase deadlock, but we can use a flag-based approach instead: set a ref and process in a `useEffect`, avoiding the extra async tick

### 5. Eagerly import PartnerMobileLayout
**File**: `src/components/PartnerResponsiveLayout.tsx`
- Remove lazy() for `PartnerMobileLayout` since it's small and always used on mobile partner routes — eliminates one Suspense layer

## Summary
- ~1 second faster initial load (splash 2100→1200ms)
- Eliminates repeated 4-query fetches on every navigation (React Query cache)
- Removes one layer of lazy loading for mobile partners
- All features remain exactly the same

