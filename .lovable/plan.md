

# Plan: Phase 4 & 5 — QR Attendance, Revenue Dashboard, Reviews & Complaints for Mess

## Phase 4: QR Attendance System

### Student Side — QR Code Display
- In `MessDashboard.tsx`, add a new "My QR" tab showing a QR code encoding `{ subscription_id, user_id }` as a JSON string
- Use a simple QR generation approach via a public QR API (`https://api.qrserver.com/v1/create-qr-code/`) rendered as an `<img>` — no new dependency needed
- QR refreshes based on active subscription selection

### Partner Side — QR Scanner + Manual Attendance
- In `MessManagement.tsx`, add a dedicated "Attendance" tab (separate from Subscriptions tab) with:
  - **QR Scan button** using browser camera via `navigator.mediaDevices.getUserMedia` + a lightweight inline barcode reader (we'll use the native `BarcodeDetector` API where available, with manual fallback)
  - On scan: decode subscription_id, auto-mark attendance for current meal (based on meal timings) via `markAttendance()`
  - **Manual attendance** grid: date picker + list of active subscribers with meal toggle buttons (existing logic, moved to its own tab)
  - **Today's dashboard**: show consumed/remaining counts per meal

### API additions in `messService.ts`
- `getAttendanceSummary(messId, date)` — returns counts per meal_type

## Phase 5: Revenue Dashboard + Reviews + Complaints

### Revenue Dashboard (Partner Side)
- Add a "Revenue" tab in `MessManagement.tsx` with:
  - Today / This Week / This Month revenue cards (computed from `mess_receipts`)
  - Active vs Expired subscription counts
  - Simple bar chart using existing Recharts setup

### API additions in `messService.ts`
- `getMessRevenueSummary(messId)` — aggregates receipts by period
- `getMessSubscriptionStats(messId)` — counts by status

### Reviews Integration
- The existing `reviews` table has `cabin_id` as a required FK. For mess reviews, we need a new `mess_reviews` table (or add optional `mess_id` column to reviews)
- **Approach**: Add `mess_id` (nullable uuid FK) column to `reviews` table + make `cabin_id` nullable + update RLS
- Update `reviewsService.ts` to support mess reviews
- Add review form in `MessMarketplace.tsx` (after subscription) and display reviews on mess detail cards

### Complaints Integration
- The existing `complaints` table already has a `module` column (values: 'reading_room', 'hostel')
- Add `mess_id` (nullable uuid FK) column to `complaints` table
- Update `ComplaintsPage.tsx` to also fetch mess subscriptions as booking options with `_type: 'mess'` and set `module: 'mess'` + `mess_id` on insert
- Admin `ComplaintsManagement.tsx` will automatically show mess complaints (already reads all)

## Database Migration
- Add `mess_id uuid references mess_partners(id) on delete set null` to `complaints` table
- Add `mess_id uuid references mess_partners(id) on delete set null` to `reviews` table
- Make `cabin_id` nullable in `reviews` table (if not already)
- Add RLS policies for mess reviews

## Files to Create/Modify

| File | Change |
|------|--------|
| `src/pages/students/MessDashboard.tsx` | Add QR code tab |
| `src/pages/admin/MessManagement.tsx` | Separate Attendance tab with QR scan + Revenue tab |
| `src/api/messService.ts` | Add revenue summary + attendance summary APIs |
| `src/components/profile/ComplaintsPage.tsx` | Add mess subscriptions as complaint source |
| `src/api/reviewsService.ts` | Support mess_id for mess reviews |
| `src/pages/MessMarketplace.tsx` | Show reviews on mess cards + review form |
| Migration | Add mess_id to complaints + reviews tables |

