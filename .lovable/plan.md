

# Plan: Align Mess Module UI with Hostel/Reading Room Patterns

## Current State
The Mess module currently uses a **single tabbed page** (`MessManagement.tsx`) with Profile, Timings, Packages, Menu, Subscriptions, Attendance, Revenue all as tabs. This is completely different from how Hostels work — Hostels use a **card-grid management page** (like `HostelManagement.tsx` with `HostelItem` cards) plus **separate pages** for Bookings, Receipts, Deposits, each accessible from sidebar sub-items.

The `mess_partners` table also lacks `images`, `logo_image` columns that hostels have.

## What Needs to Change

### 1. Database Migration
Add `images` (jsonb) and `logo_image` (text) columns to `mess_partners` table so mess places can display photos like hostels do.

### 2. New: `MessItem.tsx` — Card Component (mirrors `HostelItem.tsx`)
A card component showing:
- Mess image (from `logo_image` / `images[0]`)
- Food type badge (Veg/Non-Veg/Both)
- Active/Inactive status
- Booking status (on/off — reuse `is_booking_active` concept, add column)
- Serial number
- Buttons: Edit, Packages, Activate/Deactivate, Enable/Pause Booking
- ShareButton integration

### 3. New: `MessEditor.tsx` — Full Editor (mirrors `HostelEditor.tsx`)
Accordion-based editor with sections:
- **Section 1**: Basic Info (name, location, description, contact, food type, capacity, opening days)
- **Section 2**: Images (logo + gallery using existing `ImageUpload`)
- **Section 3**: Meal Timings (inline CRUD for breakfast/lunch/dinner times)
- **Section 4**: Weekly Menu (day × meal grid, same as current menu tab)

This merges the current Profile + Timings + Menu tabs into the editor, so editing a mess place shows everything in one form — just like the HostelEditor shows all hostel details.

### 4. Rewrite: `MessManagement.tsx` → Card Grid Page (mirrors `HostelManagement.tsx`)
Replace the current tabbed single-partner page with a **card grid** listing all mess places:
- Admin sees all mess partners; partner sees their own
- Search, pagination (same pattern as HostelManagement)
- Add Mess button → opens MessEditor
- Edit → opens MessEditor with existing data
- Packages button → dialog with package manager
- Toggle Active/Inactive, Toggle Booking On/Off
- No more tabs for profile/timings/menu here — those move into the editor

### 5. New: `MessBookings.tsx` — Separate Bookings Page (mirrors `AdminHostelBookings.tsx`)
Paginated table of `mess_subscriptions` with:
- Search, status filter
- Columns: Serial #, Student Name, Package, Start/End Date, Status, Amount
- Same table/pagination pattern as hostel bookings

### 6. New: `MessReceipts.tsx` — Separate Receipts Page (mirrors `HostelReceipts.tsx`)
Paginated table of `mess_receipts` with:
- Search, date filter
- Columns: Serial #, Student, Amount, Payment Method, Date

### 7. Update: `AdminSidebar.tsx` — Match Hostel Sidebar Structure
Replace current mess sub-items with:
| Sub-item | URL | Notes |
|----------|-----|-------|
| Manage Mess | `{prefix}/mess-places` (admin only) | Card grid page |
| Subscriptions | `{prefix}/mess-bookings` | Bookings table |
| Receipts | `{prefix}/mess-receipts` | Receipts table |
| Attendance | `{prefix}/mess-attendance` | Keep existing attendance + QR + revenue |
| Reviews | `/admin/reviews?module=Mess` | Admin only |

### 8. Update: `App.tsx` — Add New Routes
Add routes for `mess-places`, `mess-bookings`, `mess-receipts`, `mess-attendance` under both admin and partner route groups.

### 9. Student Side — Show Like Hostels
The `MessMarketplace.tsx` already shows cards; ensure mess images display the same way as hostel cards in `Hostels.tsx` (image with aspect-video, food type badge overlay, same card spacing).

### 10. Add `is_booking_active` Column
Add `is_booking_active boolean NOT NULL DEFAULT true` to `mess_partners` to support booking toggle (same as hostels).

### 11. `messService.ts` Updates
- Add `getAllMessPartners()` for admin (no filters)
- Add `getUserMessPartners()` for partners (filtered by user_id)
- Add `toggleMessActive()`, `toggleMessBooking()`, `deleteMessPartner()`
- Update `upsertMessPartner` to handle images/logo

## Files Summary

| File | Action |
|------|--------|
| Migration | Add `images`, `logo_image`, `is_booking_active` to `mess_partners` |
| `src/components/admin/MessItem.tsx` | Create (mirrors HostelItem) |
| `src/components/admin/MessEditor.tsx` | Create (mirrors HostelEditor with timings + menu) |
| `src/pages/admin/MessManagement.tsx` | Rewrite as card grid (mirrors HostelManagement) |
| `src/pages/admin/MessBookings.tsx` | Create (mirrors AdminHostelBookings) |
| `src/pages/admin/MessReceipts.tsx` | Create (mirrors HostelReceipts) |
| `src/pages/admin/MessAttendance.tsx` | Create (extract attendance + QR + revenue from old MessManagement) |
| `src/components/admin/AdminSidebar.tsx` | Update mess sub-items |
| `src/App.tsx` | Add new mess routes |
| `src/api/messService.ts` | Add admin/partner CRUD functions |
| `src/pages/MessMarketplace.tsx` | Update cards to show images like hostels |

