

# Add Laundry to Admin Sidebar and Student Navigation

## Problem
The laundry routes (`/admin/laundry`, `/partner/laundry`, `/laundry`, `/student/laundry-orders`) exist in `App.tsx` but are not linked from any navigation -- neither the admin sidebar nor the student bottom nav. Users cannot access any laundry features.

## Changes

### 1. Admin Sidebar (`src/components/admin/AdminSidebar.tsx`)

Add a **"Laundry"** top-level menu item (with a `Shirt` icon) to the sidebar for admin and partner roles. Place it after the "Hostels" section (before "Users").

```typescript
import { Shirt } from 'lucide-react';
```

Add to `menuItems` array (after the Hostels block, around line 251):
```typescript
menuItems.push({
  title: 'Laundry',
  url: `${routePrefix}/laundry`,
  icon: Shirt,
  roles: ['admin', 'vendor', 'vendor_employee'],
});
```

This gives both admins (`/admin/laundry`) and partners (`/partner/laundry`) access to the laundry management dashboard.

### 2. Student Mobile Bottom Nav (`src/components/student/MobileBottomNav.tsx`)

This is trickier since the bottom nav only has 4 slots and they're already used. Instead of modifying the bottom nav, laundry is already accessible from the student landing page (`/laundry` route). No change needed here -- the student can navigate to `/laundry` from the home page or profile.

### 3. Add Laundry link to AdminLayout route labels (`src/components/AdminLayout.tsx`)

Add route label entries so the breadcrumb header shows "Laundry" correctly:
```typescript
"/admin/laundry": "Laundry",
"/partner/laundry": "Laundry",
```

### Summary of File Changes

| File | Change |
|------|--------|
| `src/components/admin/AdminSidebar.tsx` | Add `Shirt` import + "Laundry" menu item after Hostels section |
| `src/components/AdminLayout.tsx` | Add `/admin/laundry` and `/partner/laundry` route labels |

