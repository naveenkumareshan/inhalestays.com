
# Dynamic Partner Sidebar and Property Type Management

## Problem
Currently all partners see all sidebar sections (Reading Rooms, Hostels, Laundry) regardless of what properties they actually manage. A laundry-only partner sees hostel and reading room options, and vice versa.

## Solution

### 1. Create a `usePartnerPropertyTypes` hook
A new hook that queries the database to determine which property types a partner has linked:
- **Reading Rooms**: Check if any rows in `cabins` have `created_by = user.id`
- **Hostels**: Check if any rows in `hostels` have `created_by = user.id`
- **Laundry**: Check if any rows in `laundry_partners` have `user_id = user.id`

Returns: `{ hasReadingRooms, hasHostels, hasLaundry, loading }`

File: `src/hooks/usePartnerPropertyTypes.ts` (new)

### 2. Update AdminSidebar to conditionally show sections
In `src/components/admin/AdminSidebar.tsx`:
- Import and use the new hook (only for partner roles)
- **Reading Rooms section** (line 109): Only show if `hasReadingRooms` is true OR user is admin
- **Hostels section** (line 190): Only show if `hasHostels` is true OR user is admin
- **Laundry section** (line 255): Only show if `hasLaundry` is true OR user is admin
- **Manage Properties** (line 284): Always show for partners (so they can add new properties)

Admin users always see everything -- no change for them.

### 3. Update ManageProperties page to include Laundry tab
In `src/pages/partner/ManageProperties.tsx`:
- Add a third "Laundry" tab alongside Reading Rooms and Hostels
- Use the hook to only show tabs for property types the partner actually has (or show all if none yet, for new partners)
- The Laundry tab content will lazy-load the existing laundry management page

### 4. Property type selection when adding a new property
Currently the "Add New Property" button navigates to `/partner/profile`. This will be updated:
- Show a dialog/dropdown asking the partner to choose: Reading Room, Hostel, or Laundry
- Reading Room: Navigate to partner profile / property creation flow (existing)
- Hostel: Navigate to hostel creation flow (existing)
- Laundry: Navigate to laundry partner setup (existing admin flow, adapted for self-service)

---

## Technical Details

### New Hook (`src/hooks/usePartnerPropertyTypes.ts`)
```text
Queries:
  supabase.from('cabins').select('id').eq('created_by', userId).limit(1)
  supabase.from('hostels').select('id').eq('created_by', userId).limit(1)
  supabase.from('laundry_partners').select('id').eq('user_id', userId).limit(1)

Returns: { hasReadingRooms: boolean, hasHostels: boolean, hasLaundry: boolean, loading: boolean }
```

### AdminSidebar Changes
- Wrap Reading Rooms block (lines 109-187) with: `if (user?.role === 'admin' || (isPartner && propertyTypes.hasReadingRooms))`
- Wrap Hostels block (lines 190-252) with: `if (user?.role === 'admin' || (isPartner && propertyTypes.hasHostels))`
- Wrap Laundry item (lines 255-260) with: `if (user?.role === 'admin' || (isPartner && propertyTypes.hasLaundry))`
- Also conditionally show partner-specific vendor menu items like "Reports > Hostel Reports" only if they have hostels

### ManageProperties Changes
- Import the hook to determine which tabs to show
- Add Laundry tab with `Shirt` icon
- Only render tabs for property types the partner has
- Update "Add New Property" to show a selection dialog (Reading Room / Hostel / Laundry)

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/usePartnerPropertyTypes.ts` | New hook to detect partner's linked property types |
| `src/components/admin/AdminSidebar.tsx` | Conditionally show sidebar sections based on property types |
| `src/pages/partner/ManageProperties.tsx` | Add Laundry tab, conditionally show tabs, property type selector for "Add New" |
