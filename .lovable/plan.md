

# Fix "Add Property" Buttons for Hostel, Laundry, Mess in Partner Manage Properties

## Root Cause

In `ManageProperties.tsx`, tabs and their content are conditionally rendered based on `showAllTabs || hasHostels` (etc.). When a partner already has Reading Rooms but no Hostels, `showAllTabs` is `false` and `hasHostels` is `false`, so the Hostels tab + TabsContent is **never rendered**. Clicking "Add Hostel" sets `activeTab='hostels'` and `triggerNew=true`, but since the TabsContent doesn't exist in the DOM, nothing happens.

Same issue for Laundry and Mess tabs.

Additionally, `MessManagement` and `LaundryPartnerDashboard` don't accept `autoCreateNew`/`onTriggerConsumed` props, so even if the tab rendered, the auto-create trigger wouldn't fire.

## Fix

### `src/pages/partner/ManageProperties.tsx`
- Change tab visibility logic: always show a tab if it's the `activeTab` (i.e., `showAllTabs || hasX || activeTab === 'tabName'`). This ensures when "Add Property" switches to a new tab, that tab's content renders.
- Pass `autoCreateNew` and `onTriggerConsumed` props to `MessManagement` (same pattern as HostelManagement and RoomManagement).
- For Laundry: since it's a different flow (partner registration-based), navigate to laundry registration or show the dashboard. The "Add Laundry" can trigger a registration form within the dashboard. For now, ensure the tab at least renders so the partner sees the laundry dashboard where they can set up their service.

### `src/pages/admin/MessManagement.tsx`
- Add `autoCreateNew` and `onTriggerConsumed` props (same pattern as `HostelManagement`).
- Add a `useEffect` that calls `handleAddMess()` when `autoCreateNew` is true.

### `src/pages/LaundryPartnerDashboard.tsx`
- Add `autoCreateNew` and `onTriggerConsumed` props.
- When `autoCreateNew` fires and no laundry partner record exists, trigger the registration/setup flow (or show a setup prompt).

## Files Modified
- `src/pages/partner/ManageProperties.tsx` — fix tab visibility logic
- `src/pages/admin/MessManagement.tsx` — add autoCreateNew prop support
- `src/pages/LaundryPartnerDashboard.tsx` — add autoCreateNew prop support

