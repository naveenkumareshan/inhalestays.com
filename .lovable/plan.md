

# Monthly Billing Cycle for Hostels — Refined Plan

## Database Migrations

### Migration 1: Add billing columns to `hostels`
```sql
ALTER TABLE hostels ADD COLUMN billing_type text NOT NULL DEFAULT 'day_model';
ALTER TABLE hostels ADD COLUMN payment_window_days integer NOT NULL DEFAULT 5;
```

### Migration 2: Add billing metadata to `hostel_dues`
```sql
ALTER TABLE hostel_dues ADD COLUMN billing_month date;
ALTER TABLE hostel_dues ADD COLUMN is_prorated boolean NOT NULL DEFAULT false;
ALTER TABLE hostel_dues ADD COLUMN auto_generated boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX idx_hostel_dues_booking_month ON hostel_dues (booking_id, billing_month) WHERE billing_month IS NOT NULL;
```

### Migration 3: Enable pg_cron and pg_net extensions
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
```

### Cron job (via insert tool, not migration)
Schedule daily cron calling the edge function at midnight.

## Edge Function: `generate-monthly-hostel-dues`

Runs daily. Logic:
1. Query all hostels where `billing_type = 'monthly_cycle'`
2. For each, get active bookings (`status = 'confirmed'`, `end_date >= first of current month`)
3. For each booking, check if `hostel_dues` with `billing_month = first of current month` already exists for that `booking_id`
4. If not, insert a new due:
   - `due_amount` = monthly rent from `hostel_sharing_options.price_monthly`
   - `due_date` = 1st of month + `payment_window_days`
   - `billing_month` = first of current month (DATE)
   - `auto_generated = true`
5. Mark overdue: `UPDATE hostel_dues SET status = 'overdue' WHERE status = 'pending' AND paid_amount = 0 AND due_date < CURRENT_DATE AND billing_month IS NOT NULL`
6. No duplicate generation thanks to the unique index

### Pro-rata calculation (actual days in month)
```
Days remaining = days_in_month - (join_day - 1)
Pro-rated amount = monthly_rent × (days_remaining / days_in_month)
```
Uses `getDaysInMonth()` from date-fns for the actual month length.

## Frontend Changes

### `HostelEditor.tsx`
Add Section 10 (or within Section 3 — Pricing):
- Select: "Billing Type" — `Day Model` (default) | `Monthly Cycle`
- When Monthly Cycle: show "Payment Window (days)" number input (default 5)
- Wire `billing_type` and `payment_window_days` into hostel state and save

### `hostelBookingService.ts` — `createBooking`
After booking is created, if the hostel has `billing_type = 'monthly_cycle'`:
- Fetch hostel's `billing_type` and `payment_window_days`
- Calculate pro-rated first month amount using actual days in month
- Insert `hostel_dues` with `is_prorated = true`, `billing_month = first of join month`, `auto_generated = false`
- Set `due_date` = join date (immediate payment for first month)

### `HostelDueManagement.tsx`
- Add `billing_month` column: show "Mar 2026" when present
- Add `Auto` badge for `auto_generated = true` dues
- Add `Prorated` badge for `is_prorated = true` dues
- Add "Overdue" as a filter option in status dropdown
- Update `getStatusBadge` to handle `status = 'overdue'` from DB

### `supabase/config.toml`
Add:
```toml
[functions.generate-monthly-hostel-dues]
verify_jwt = false
```

## Files to Create/Modify
- **Create**: `supabase/functions/generate-monthly-hostel-dues/index.ts`
- **Modify**: `src/components/admin/HostelEditor.tsx` — billing type UI
- **Modify**: `src/api/hostelBookingService.ts` — pro-rata on create
- **Modify**: `src/pages/admin/HostelDueManagement.tsx` — new columns/badges/filter

