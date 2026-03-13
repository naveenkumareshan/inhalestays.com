

# Customizable Partner Bottom Navigation

## Concept
Let partners choose which 4 menu items appear in their bottom nav bar (the 5th slot is always "More"). Their preferences are saved to the database and persist across sessions/devices.

## How It Works
- **Default**: Dashboard, Bookings, Properties, Earnings (current setup)
- **Customization**: In the "More" menu, add an "Edit Navigation" button. Tapping it enters an edit mode where the partner can pick any 4 items from the full feature list to pin to their bottom nav
- **Storage**: Save the selected nav items per user in a `partner_nav_preferences` table
- **Fallback**: If no preference is saved, use the current defaults

## Database
New table `partner_nav_preferences`:
- `id` (uuid, PK)
- `user_id` (uuid, not null, unique)
- `nav_items` (jsonb) — array of `{ key, label, url, icon }` (max 4)
- `created_at`, `updated_at`

RLS: Users can only read/write their own row.

## Files

### 1. Create `src/components/partner/PartnerNavCustomizer.tsx`
- A dialog/sheet that shows all available menu items in a grid
- Partner taps to select up to 4 items — selected items show a checkmark/badge with order number
- "Save" button persists to database
- "Reset to Default" option

### 2. Create `src/hooks/usePartnerNavPreferences.ts`
- Fetches the partner's saved nav items from `partner_nav_preferences`
- Returns the 4 pinned items (or defaults if none saved)
- Provides a `savePreferences` function
- Caches with React Query

### 3. Modify `src/components/partner/PartnerBottomNav.tsx`
- Instead of hardcoded `tabs`, use items from `usePartnerNavPreferences`
- Map saved icon names back to Lucide components via a lookup table
- "More" tab remains fixed as the 5th slot

### 4. Modify `src/components/partner/PartnerMoreMenu.tsx`
- Add "Customize Navigation" button at the top of the sheet
- Opens `PartnerNavCustomizer`

### 5. Database migration
- Create `partner_nav_preferences` table with RLS policies

## UX Flow
1. Partner opens "More" menu → taps "Customize Nav Bar"
2. Sees all available features in a grid with current 4 highlighted
3. Taps to toggle items (max 4). Order = selection order
4. Saves → bottom nav updates immediately
5. Next login, preferences load from DB

