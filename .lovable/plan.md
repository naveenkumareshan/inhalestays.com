

## Fix: Infinite recursion in `hostels` RLS policy

**Root cause**: The policy "Linked mess owner can view hostel name" on `hostels` table references `hostel_mess_links`, while the "Partner access own hostel_mess_links" policy on `hostel_mess_links` references `hostels` — creating a circular dependency that triggers Postgres's infinite recursion detection.

This breaks any query that touches both tables, including the Mess Subscriptions page query which embeds `hostel_bookings -> hostels`.

**Fix**: Drop the "Linked mess owner can view hostel name" policy from `hostels`. It is no longer needed because the `get_mess_linked_hostels` SECURITY DEFINER RPC (already deployed) bypasses RLS and handles this use case.

### Changes

1. **Database migration** — Single statement:
   ```sql
   DROP POLICY "Linked mess owner can view hostel name" ON public.hostels;
   ```

2. **No frontend changes needed** — The Mess Management page already uses the RPC. The Subscriptions page query will stop erroring once the recursive policy is removed.

