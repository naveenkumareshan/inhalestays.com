

# Plan: Redesign Partner Management — Property-Centric View

## Current State
The "All Partners" page (`VendorApproval.tsx`) shows a flat table of partners with basic info (business name, contact, status). Properties are only visible after clicking "View" and navigating to the "Properties" tab inside a dialog. This makes it hard to get a complete picture at a glance.

## Redesigned Approach
Replace the flat table with an **expandable card/accordion layout** where each partner row can be expanded inline to reveal all their properties (Reading Rooms + Hostels) with key metrics — no dialog needed for the overview.

## Changes

### `src/components/admin/VendorApproval.tsx` — Full Redesign

**New Layout:**
- Each partner renders as a compact card row with:
  - Business name, contact person, email, phone, status badge, joined date
  - **Property count pills**: e.g. `2 Reading Rooms · 1 Hostel` inline
  - Action buttons (approve/reject/suspend, payout settings, view details)
- **Expandable section** (Collapsible): clicking a partner row expands to show:
  - A compact table/grid of their properties with columns: Name, Type, Location, Capacity, Active Bookings, Seats/Beds, Status (approved/pending), Active toggle
  - Quick stats row: Total Revenue, Active Students, Occupancy %
- Keep the existing filters (status, business type, search) and pagination
- Keep VendorDetailsDialog for deep-dive editing (basic/business/bank/documents/actions tabs)

**Data Fetching:**
- After fetching partners, batch-fetch all cabins + hostels grouped by `created_by`
- Also fetch booking counts per property for the inline stats
- Store as a `Map<partner_user_id, PropertyInfo[]>` for O(1) lookup during render

**Stats Cards:**
- Keep existing `VendorStatsCards` at top

### No new files needed — this is a rewrite of `VendorApproval.tsx`

### `src/components/admin/VendorStatsCards.tsx` — Minor tweak
- Add "Total Properties" stat card showing combined cabin + hostel count

## Key UI Elements
- Use `Collapsible` from radix for expand/collapse per partner
- Property rows inside use a mini `Table` with `text-[11px]` density
- Color-coded property type badges (blue for Reading Room, purple for Hostel)
- Active/inactive status shown with green/gray dot indicators
- Occupancy shown as a small progress bar

## Files to Modify
| File | Change |
|------|--------|
| `src/components/admin/VendorApproval.tsx` | Complete redesign with expandable partner cards showing inline properties |

