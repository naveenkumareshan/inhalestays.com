

## Fix Ticket Messages: Disappearing Messages & Partner/Employee Access

### Root Causes

1. **Vendor policies don't use `is_partner_or_employee_of()`** — They check `cab.created_by = auth.uid()` directly, so employees of partners cannot see or send complaint messages
2. **Vendor policies don't cover `mess_id` complaints** — The complaints table has a `mess_id` column, but vendor RLS only checks `cabin_id` and `hostel_id`
3. **Messages "disappearing" for students** — The student SELECT policy works correctly (verified data exists in DB). This is likely a UI issue where messages load but the component re-renders or the query fails silently. Need to check TicketChat error handling.

### Fix: Update RLS Policies on `ticket_messages`

**Drop and recreate 4 policies:**

1. **Vendors can view messages on own property complaints** — Replace direct `created_by = auth.uid()` checks with `is_partner_or_employee_of()` and add `mess_id` support
2. **Vendors can insert messages on own property complaints** — Same fix
3. **Students can view messages on own tickets** — Keep as-is (correct)
4. **Students can insert messages on own tickets** — Keep as-is (correct)

Updated vendor SELECT policy:
```sql
ticket_type = 'complaint' AND EXISTS (
  SELECT 1 FROM complaints c
  WHERE c.id = ticket_messages.ticket_id
  AND (
    EXISTS (SELECT 1 FROM cabins cab WHERE cab.id = c.cabin_id AND is_partner_or_employee_of(cab.created_by))
    OR EXISTS (SELECT 1 FROM hostels h WHERE h.id = c.hostel_id AND is_partner_or_employee_of(h.created_by))
    OR EXISTS (SELECT 1 FROM mess_partners mp WHERE mp.id = c.mess_id AND is_partner_or_employee_of(mp.user_id))
  )
)
```

Same pattern for vendor INSERT policy.

### Fix: TicketChat Error Handling

In `TicketChat.tsx`, the `loadMessages` function silently swallows errors. Add error logging so failed queries are visible rather than showing an empty chat.

### Files to Modify
- **Database migration** — Drop & recreate 2 vendor policies on `ticket_messages` with `is_partner_or_employee_of()` + mess support
- `src/components/shared/TicketChat.tsx` — Add error handling to `loadMessages`

