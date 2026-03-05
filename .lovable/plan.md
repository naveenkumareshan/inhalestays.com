

# Fix: Per-Property Free Trial Days + Hostel Starting Price

## Issue 1: Free Trial — No Per-Property Control

**Current behavior**: There is a single global `partner_trial_days` value in `platform_config` that applies universally to all partners from their registration date. There is no per-property free trial control.

**User wants**: Individual free trial days for each property (hostel or reading room).

**Plan**:
1. Add a `free_trial_days` column (integer, default 0) to the `cabins` table and `hostels` table via migration. This lets admin set free trial days per property.
2. Update `ManageProperties.tsx` trial logic: instead of only checking global `partner_trial_days` from registration date, also check per-property `free_trial_days` on each property. If a property has `free_trial_days > 0`, the partner can use that property for free for that many days from the property's `created_at`.
3. Update `AdminSettingsNew.tsx` — keep the global trial days as a default, but add a note that per-property overrides exist.
4. Add a `free_trial_days` input field in both `CabinEditor` and `HostelEditor` (admin-only) so admins can set per-property trial days.

**Wait** — re-reading the requirement: "for every property there should be individual free days." This means the admin wants to control how many free trial days each individual property gets, not a blanket number. So the column goes on `cabins` and `hostels` tables, and the admin can set it when editing a property.

Actually, looking more carefully: the current system uses a global trial period for **partners** (not properties). The user wants per-property trial control. I'll add the column to both tables and update the subscription gate logic.

## Issue 2: Hostel Starting Price Not Displayed

**Current behavior**: The student-facing hostel listing (`Hostels.tsx` line 250-256) computes `minPrice` by scanning all `hostel_rooms → hostel_sharing_options → price_monthly`. This requires fetching nested room data. Cabins have a direct `price` column used as the starting/base price.

**User wants**: A `starting_price` field on hostels (like `price` on cabins) that partners/admins can set, which is displayed to students.

**Plan**:
1. Add `starting_price` (numeric, default 0) column to `hostels` table via migration.
2. Add a "Starting Price" input in `HostelEditor` (in the pricing/deposit section).
3. Update `Hostels.tsx` listing: display `hostel.starting_price` if set, otherwise fall back to the computed min price from sharing options.
4. Update `HostelItem.tsx` to also show the starting price.

## Database Migration

```sql
-- Add per-property free trial days
ALTER TABLE cabins ADD COLUMN free_trial_days integer NOT NULL DEFAULT 0;
ALTER TABLE hostels ADD COLUMN free_trial_days integer NOT NULL DEFAULT 0;

-- Add starting price for hostels
ALTER TABLE hostels ADD COLUMN starting_price numeric NOT NULL DEFAULT 0;
```

## Files to Change

| File | Change |
|------|--------|
| **Migration** | Add `free_trial_days` to `cabins` and `hostels`, add `starting_price` to `hostels` |
| `src/components/admin/HostelEditor.tsx` | Add Starting Price input + Free Trial Days input (admin-only) |
| `src/components/admin/CabinEditor.tsx` | Add Free Trial Days input (admin-only) |
| `src/pages/Hostels.tsx` | Use `hostel.starting_price` if > 0, else fall back to computed min |
| `src/components/admin/HostelItem.tsx` | Display starting price |
| `src/pages/partner/ManageProperties.tsx` | Update trial check to also consider per-property `free_trial_days` |

