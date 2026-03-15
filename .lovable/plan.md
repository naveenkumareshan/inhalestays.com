
Root cause identified from live backend state:
- The link exists in database (`hostel_mess_links` has a row for your mess + hostel).
- UI is showing “No hostel linked” because RLS currently allows `hostel_mess_links` access only to hostel owner/admin, not the linked mess owner.
- In `MessManagement.tsx`, link fetch also has no error handling, so any policy/embed failure silently becomes an empty map.

Plan to fix

1) Fix backend access rules (primary fix)
- Add a new **SELECT-only** policy on `public.hostel_mess_links` so a mess owner (or their employee) can read links where:
  - `hostel_mess_links.mess_id = mess_partners.id`
  - `is_partner_or_employee_of(mess_partners.user_id)` is true
- Keep insert/update/delete restricted to hostel side/admin (no privilege expansion).

2) Ensure hostel names can always be read for linked rows
- Add a targeted `hostels` SELECT policy for linked mess owners (only rows linked to their mess), so embed name fetch does not return null on private/unapproved hostels.

3) Harden frontend query in Manage Mess
- File: `src/pages/admin/MessManagement.tsx`
- Use explicit FK embed for reliability:
  - `hostels!hostel_mess_links_hostel_id_fkey(name)`
- Add proper error handling + logging for link fetch.
- Keep map update deterministic (only overwrite with valid fetched results).

4) Keep hostel side consistent
- File: `src/pages/hotelManager/HostelManagement.tsx`
- Use explicit FK embed:
  - `mess_partners!hostel_mess_links_mess_id_fkey(name)`
- Add matching error handling so both screens behave consistently.

5) Verify end-to-end
- Link hostel ↔ mess from hostel side.
- Open Manage Mess as that mess user: linked hostel name must display (not “No hostel linked”).
- Validate linked subscription + attendance flow still works:
  - booking with food creates active mess subscription
  - attendance marks against active subscription and source type remains correct.

Technical notes
- This is primarily an RLS visibility issue, not missing data.
- No destructive schema change needed; only policy additions/adjustments + frontend query hardening.
- Security remains tight by granting only required SELECT scope to linked records.
