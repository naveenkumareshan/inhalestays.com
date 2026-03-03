

# Consistent Brand Color Theme Across All Pages

## Problem
The public homepage (Index.tsx) establishes a premium brand identity using the CSS variable-based theme (`primary` deep blue, `secondary` green, `accent` teal) with gradients like `bg-gradient-to-br from-primary via-primary/90 to-accent/80`. However, many other pages use ad-hoc colors (hardcoded purples, violets, arbitrary gradients) that break the cohesive brand feel. The Laundry page, for example, was recently restyled with violet/fuchsia gradients that clash with the blue/green/teal brand palette.

## Brand Color Reference (from public homepage)
- **Primary**: Deep Blue (`hsl(207, 52%, 33%)`) -- headers, CTAs, active states
- **Secondary**: Fresh Green (`hsl(105, 35%, 55%)`) -- accent badges, secondary actions  
- **Accent**: Teal/Aqua (`hsl(180, 45%, 70%)`) -- highlights, gradient endpoints
- **Hero gradient**: `from-primary via-primary/90 to-accent/80`
- **Info chips**: Use semantic colors (emerald for price, blue for capacity, etc.) -- these are fine

## Changes by File

### 1. `src/pages/Laundry.tsx` -- Student Laundry Page
The recent redesign used violet/fuchsia gradients that don't match the brand. Align to brand:
- **Hero header gradient**: Change `from-violet-600 via-purple-600 to-fuchsia-500` to `from-primary via-primary/90 to-accent/80` (matching the homepage hero)
- **Step indicator active color**: Change violet/purple gradient to `from-primary to-accent`
- **Floating bottom bar**: Change `from-violet-600 to-purple-700` to `from-primary to-primary/90`
- **Category styles**: Keep the blue/emerald/amber coding (these are semantic and work well)
- **Confirmation step**: Change violet/purple gradient to primary/accent brand gradient

### 2. `src/components/student/MobileBottomNav.tsx` -- Bottom Navigation Bar
Currently uses generic `text-primary` for active state and plain `bg-card` background. Enhance to feel more premium:
- Add a subtle gradient or tinted background to the nav bar (e.g., `bg-card/95 backdrop-blur-md`)
- Keep the active indicator using `bg-primary` (already brand-consistent)
- This is mostly fine -- minor polish only

### 3. `src/pages/BookSeat.tsx` -- Reading Room Detail
The info chips use specific semantic colors (emerald, blue, purple, amber) which work well for differentiation. The main areas to check:
- Category badge colors: `bg-purple-500/90` for premium, `bg-amber-500/90` for luxury -- these are fine as category identifiers
- Sticky collapsed header: already uses `bg-background/95` -- consistent
- Overall: This page is largely consistent. No major changes needed.

### 4. `src/pages/HostelRoomDetails.tsx` -- Hostel Detail
Similar to BookSeat -- uses semantic chip colors. Check:
- Gender badge colors (blue/pink/purple) are semantic and appropriate
- Main structure uses `bg-background`, `text-foreground`, `bg-card` -- consistent
- No major changes needed.

### 5. `src/pages/Cabins.tsx` -- Reading Rooms List
- Filter pills use `bg-primary text-primary-foreground` for active -- consistent
- "Book" button uses `text-primary bg-primary/10` -- consistent
- No changes needed.

### 6. `src/pages/Hostels.tsx` -- Hostels List
- Filter and card styling uses theme tokens -- consistent
- "View Rooms" button uses `text-primary bg-primary/10` -- consistent
- No changes needed.

### 7. `src/components/profile/ProfileManagement.tsx` -- Student Profile
- Uses `bg-card`, `text-foreground`, `bg-primary text-primary-foreground` for avatar -- consistent
- Camera button uses `bg-primary` -- consistent
- No changes needed.

### 8. `src/components/admin/AdminSidebar.tsx` -- Admin/Partner Sidebar
- Header gradient uses `hsl(var(--primary) / 0.06)` -- brand-consistent
- Active state uses `border-primary bg-primary/8 text-primary` -- consistent
- Role badges use blue/emerald/amber which are fine for role differentiation
- No changes needed.

### 9. `src/components/AdminLayout.tsx` -- Admin Layout Header
- Uses `hsl(var(--primary) / 0.04)` gradient -- consistent
- No changes needed.

## Summary

The main offender is the **Laundry page** which was recently redesigned with violet/fuchsia colors that clash with the blue/green/teal brand. All other pages are already reasonably consistent with the brand theme.

### Files Modified
| File | Change |
|------|--------|
| `src/pages/Laundry.tsx` | Replace violet/fuchsia gradients with brand primary/accent gradients |
| `src/components/student/MobileBottomNav.tsx` | Minor: add backdrop-blur for premium feel |

### No changes needed
- `src/pages/BookSeat.tsx` -- already consistent
- `src/pages/HostelRoomDetails.tsx` -- already consistent
- `src/pages/Cabins.tsx` -- already consistent
- `src/pages/Hostels.tsx` -- already consistent
- `src/components/profile/ProfileManagement.tsx` -- already consistent
- `src/components/admin/AdminSidebar.tsx` -- already consistent
- `src/components/AdminLayout.tsx` -- already consistent

