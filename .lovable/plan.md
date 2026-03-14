

# Hostel-Mess Linking: Plan

## Overview
Create a linking system between hostel properties and mess properties, so when a hostel booking includes food, a `mess_subscription` is auto-created. Track subscription source (hostel_inclusive, addon_purchase, manual) and show it in the admin UI.

## Database Migration

### 1. `hostel_mess_links` table
```sql
CREATE TABLE public.hostel_mess_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id uuid NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE,
  mess_id uuid NOT NULL REFERENCES public.mess_partners(id) ON DELETE CASCADE,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(hostel_id, mess_id)
);
```
- RLS: Admin + partner (via `is_partner_or_employee_of`) full access
- Trigger: When `is_default = true` is set, unset other defaults for the same hostel

### 2. Add `source_type` and `hostel_booking_id` to `mess_subscriptions`
```sql
ALTER TABLE public.mess_subscriptions
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS hostel_booking_id uuid REFERENCES public.hostel_bookings(id) ON DELETE SET NULL;
```
- `source_type` values: `manual`, `hostel_inclusive`, `addon_purchase`
- `package_id` becomes nullable (hostel_inclusive subscriptions may not have a mess package)

### 3. Make `package_id` nullable
```sql
ALTER TABLE public.mess_subscriptions ALTER COLUMN package_id DROP NOT NULL;
```

## Edge Function Update: `razorpay-verify-payment/index.ts`

After a hostel booking is confirmed with `food_opted = true`:
1. Look up default `hostel_mess_links` for that hostel
2. If a linked mess exists, insert a `mess_subscription`:
   - `user_id`, `mess_id`, `start_date`, `end_date` from hostel booking
   - `source_type = 'hostel_inclusive'`
   - `hostel_booking_id = bookingId`
   - `status = 'active'`, `payment_status = 'completed'`
   - `price_paid = food_amount`
3. This runs in both test mode and real payment mode

## Admin UI: Hostel-Mess Link Management

### `src/components/admin/HostelMessLinkManager.tsx` (new)
- Shown inside Hostel Editor (new collapsible section under Food Policy)
- Lists linked mess properties with "Default" toggle
- "Link Mess" button → dropdown of available mess partners
- Remove link button

### `src/components/admin/HostelEditor.tsx`
- Import and render `HostelMessLinkManager` inside the Food section (only when editing an existing hostel, not creating)

## Admin UI: Show Source in Mess Bookings

### `src/pages/admin/MessBookings.tsx`
- Add "Source" column to the subscriptions table
- Display:
  - `hostel_inclusive` → Badge "Hostel Package" + hostel name (join via `hostel_booking_id → hostel_bookings → hostels.name`)
  - `addon_purchase` → Badge "Addon" + hostel name
  - `manual` → Badge "Manual"
- Update `fetchSubs` query to join `hostel_bookings:hostel_booking_id(hostel_id, hostels:hostel_id(name))`

## Attendance: No Changes Needed
The existing `mark_qr_attendance` RPC already checks `mess_subscriptions` for active subscriptions by `user_id + mess_id + date range`. Since hostel_inclusive subscriptions are inserted into the same table with `status = 'active'`, attendance works automatically for all source types.

The `MessAttendance.tsx` page also queries `mess_subscriptions` generically — no source_type filter needed.

## File Summary

| File | Change |
|------|--------|
| DB Migration | Create `hostel_mess_links`, add `source_type` + `hostel_booking_id` to `mess_subscriptions`, make `package_id` nullable |
| `supabase/functions/razorpay-verify-payment/index.ts` | Auto-create mess subscription when hostel booking with food is confirmed |
| `src/components/admin/HostelMessLinkManager.tsx` | New component for linking hostels to mess properties |
| `src/components/admin/HostelEditor.tsx` | Add HostelMessLinkManager section |
| `src/pages/admin/MessBookings.tsx` | Add Source column showing subscription origin |

