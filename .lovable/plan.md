

# Fix: Support Tickets Visibility + Chat-Style Messaging for Both Complaints & Support

## Issue 1: Admin Cannot See Support Tickets

The RLS policy uses `public.has_role(auth.uid(), 'admin')` without the `::app_role` cast. The `has_role` function signature requires `app_role` enum type. PostgreSQL may fail to auto-cast the text literal, causing the admin SELECT to silently return zero rows. The admin ALL policy needs to be recreated with proper casting.

**Fix**: Drop and recreate the admin policy with `'admin'::app_role`.

## Issue 2: Chat-Style Messaging for Both Complaints & Support Tickets

Currently both systems use a single `response`/`admin_response` field — one message from each side. The user wants back-and-forth chat until resolved/closed, then lock the thread.

### Approach: Create a shared `ticket_messages` table

A single messages table serving both complaints and support tickets, with a `ticket_type` discriminator.

### DB Changes

```sql
-- 1. Fix admin RLS for support_tickets
DROP POLICY IF EXISTS "Admins can manage all tickets" ON public.support_tickets;
CREATE POLICY "Admins can manage all tickets"
  ON public.support_tickets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Students can view own tickets" ON public.support_tickets;
CREATE POLICY "Students can view own tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Create ticket_messages table
CREATE TABLE public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_type text NOT NULL, -- 'complaint' or 'support'
  ticket_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  sender_role text NOT NULL DEFAULT 'student', -- 'student', 'vendor', 'admin'
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Students can insert messages on their own tickets
-- Students can view messages on their own tickets
-- Admins can manage all messages
-- Vendors can manage messages on complaints for their properties
```

### UI Changes

| File | Change |
|------|--------|
| `src/components/profile/SupportPage.tsx` | When clicking a ticket, open a chat view showing all `ticket_messages` for that ticket. Add message input at bottom. Disable input when status is `resolved` or `closed`. |
| `src/components/profile/ComplaintsPage.tsx` | Same chat-style view when clicking a complaint card. Disable input when resolved/closed. |
| `src/components/admin/SupportTicketsManagement.tsx` | Replace the dialog's single textarea with a chat thread from `ticket_messages`. Admin can send messages and change status. Disable messaging when resolved/closed. |
| `src/components/admin/operations/ComplaintTracker.tsx` | Replace single response field with chat thread. Disable when resolved/closed. |

### Chat UI Pattern (shared across all 4 components)

- Messages shown in a scrollable area, student messages on right (blue), admin/vendor on left (gray)
- Each message shows sender name, time, and text
- Text input + send button at bottom
- "This ticket is resolved" banner when status is resolved/closed, no input shown
- Initial `description` shown as the first "message" (read from the parent ticket, not duplicated)

### Files to Modify

| File | Change |
|------|--------|
| DB migration | Fix RLS cast + create `ticket_messages` table with RLS |
| `src/components/profile/SupportPage.tsx` | Add chat view per ticket |
| `src/components/profile/ComplaintsPage.tsx` | Add chat view per complaint |
| `src/components/admin/SupportTicketsManagement.tsx` | Replace single response with chat thread |
| `src/components/admin/operations/ComplaintTracker.tsx` | Replace single response with chat thread |

