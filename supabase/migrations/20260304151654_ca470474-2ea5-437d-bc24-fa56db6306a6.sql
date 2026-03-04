-- 1. Fix admin RLS for support_tickets (cast to app_role)
DROP POLICY IF EXISTS "Admins can manage all tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can manage all support tickets" ON public.support_tickets;
CREATE POLICY "Admins can manage all support tickets"
  ON public.support_tickets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Also fix the student SELECT policy to include admin fallback
DROP POLICY IF EXISTS "Students can view own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Students can view own support tickets" ON public.support_tickets;
CREATE POLICY "Students can view own support tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Create ticket_messages table for chat-style messaging
CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_type text NOT NULL,
  ticket_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  sender_role text NOT NULL DEFAULT 'student',
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Admins can do everything on ticket_messages
CREATE POLICY "Admins can manage all ticket messages"
  ON public.ticket_messages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Students can INSERT messages on their own support tickets or complaints
CREATE POLICY "Students can insert messages on own tickets"
  ON public.ticket_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND (
      (ticket_type = 'support' AND EXISTS (
        SELECT 1 FROM support_tickets st WHERE st.id = ticket_messages.ticket_id AND st.user_id = auth.uid()
      ))
      OR
      (ticket_type = 'complaint' AND EXISTS (
        SELECT 1 FROM complaints c WHERE c.id = ticket_messages.ticket_id AND c.user_id = auth.uid()
      ))
    )
  );

-- Students can VIEW messages on their own tickets
CREATE POLICY "Students can view messages on own tickets"
  ON public.ticket_messages FOR SELECT TO authenticated
  USING (
    (ticket_type = 'support' AND EXISTS (
      SELECT 1 FROM support_tickets st WHERE st.id = ticket_messages.ticket_id AND st.user_id = auth.uid()
    ))
    OR
    (ticket_type = 'complaint' AND EXISTS (
      SELECT 1 FROM complaints c WHERE c.id = ticket_messages.ticket_id AND c.user_id = auth.uid()
    ))
  );

-- Vendors can INSERT messages on complaints for their properties
CREATE POLICY "Vendors can insert messages on own property complaints"
  ON public.ticket_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND ticket_type = 'complaint' AND EXISTS (
      SELECT 1 FROM complaints c
      WHERE c.id = ticket_messages.ticket_id
      AND (
        EXISTS (SELECT 1 FROM cabins cab WHERE cab.id = c.cabin_id AND cab.created_by = auth.uid())
        OR EXISTS (SELECT 1 FROM hostels h WHERE h.id = c.hostel_id AND h.created_by = auth.uid())
      )
    )
  );

CREATE POLICY "Vendors can view messages on own property complaints"
  ON public.ticket_messages FOR SELECT TO authenticated
  USING (
    ticket_type = 'complaint' AND EXISTS (
      SELECT 1 FROM complaints c
      WHERE c.id = ticket_messages.ticket_id
      AND (
        EXISTS (SELECT 1 FROM cabins cab WHERE cab.id = c.cabin_id AND cab.created_by = auth.uid())
        OR EXISTS (SELECT 1 FROM hostels h WHERE h.id = c.hostel_id AND h.created_by = auth.uid())
      )
    )
  );