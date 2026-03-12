

# Fix Manage Properties — Trial Logic, Per-Property Trial, Remove Profile Add, Fix Hostel/Laundry/Mess Tabs

## Issues to Fix

1. **Trial toast fires immediately on "Add Property"** — Currently `handleAddProperty` shows a toast about trial days before the property is even created/approved. Trial should only matter for subscription gating, not show an unnecessary toast. Remove the trial/subscription toast on add — just proceed to the editor directly since properties start as "Pending Approval" anyway (no subscription check needed at creation time; restriction applies at activation/approval).

2. **Trial badge on top of Manage Properties is global, not per-property** — The trial badge at the page header uses `partner.created_at` globally. Move trial/subscription status into each property card (`CabinItem` and `HostelItem`) instead. Each card should show its own subscription/trial status badge (e.g., "Trial (Xd left)" or "Subscribed" or "No Plan"). Query `property_subscriptions` per property and fall back to partner trial calculation.

3. **Remove "Add Property" from VendorProfile** — The `properties` tab in `VendorProfile.tsx` has an "Add New Property" button and dialog that collects minimal info. Remove the entire `properties` TabsContent, the `showAddProperty` dialog, and all related state/handlers from `VendorProfile.tsx`. Keep only Basic Info, Business, Bank, and Documents tabs.

4. **Hostel, Laundry, and Mess buttons in Add Property dialog don't work** — Currently `handleAddProperty('hostels')` sets `triggerNew=true` and switches to the hostels tab, which calls `HostelManagement` with `autoCreateNew`. But `HostelManagement` only shows the "Add Hostel" button for `user?.role === 'admin'`. Fix: Also allow partner role (`vendor`) to add hostels. Same issue for Laundry — `LaundryPartnerDashboard` doesn't accept `autoCreateNew` prop. Add Mess tab support to ManageProperties as well.

## Changes

### `src/pages/partner/ManageProperties.tsx`
- Remove trial badge from page header (the global one)
- Remove subscription/trial gating from `handleAddProperty` — just proceed directly (properties are pending approval anyway)
- Remove `universalSub`, `anySub`, `trialConfig`, `isInTrial`, `trialDaysRemaining` queries and computations
- Add `hasMess` from `usePartnerPropertyTypes` and add a Mess tab + lazy-load `MessManagement`
- Add Mess option in Add Property dialog

### `src/components/admin/CabinItem.tsx`
- Add per-property trial/subscription badge inside the card using `useSubscriptionAccess` hook (pass `cabin._id`, `'reading_room'`, and partner ID)
- Show small badge: "Trial (Xd)" / "Subscribed" / "No Plan"

### `src/components/admin/HostelItem.tsx`
- Same per-property subscription badge using `useSubscriptionAccess`

### `src/pages/hotelManager/HostelManagement.tsx`
- Change `{user?.role === 'admin' && (` to `{(user?.role === 'admin' || user?.role === 'vendor') && (` for the "Add Hostel" button
- Allow partner to trigger `handleAddHostel` via `autoCreateNew`

### `src/components/vendor/VendorProfile.tsx`
- Remove the `properties` tab entirely — remove TabsTrigger for "properties", remove TabsContent for "properties", remove Add Property dialog, remove all related state variables (`showAddProperty`, `newPropertyType`, `newPropertyName`, `newPropertyCity`, `newPropertyState`, `newPropertyGender`, `addingProperty`, `properties`, `fetchProperties`, `handleAddProperty`)

### `src/pages/LaundryPartnerDashboard.tsx`
- No changes needed for now — laundry partner registration is a separate flow. The Add Property dialog for laundry can navigate to the laundry tab which already shows the dashboard.

## Files Modified
- `src/pages/partner/ManageProperties.tsx` — simplify, add Mess tab
- `src/components/admin/CabinItem.tsx` — add per-property subscription badge
- `src/components/admin/HostelItem.tsx` — add per-property subscription badge
- `src/pages/hotelManager/HostelManagement.tsx` — allow partner to add hostels
- `src/components/vendor/VendorProfile.tsx` — remove properties tab + add property dialog

