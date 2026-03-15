
-- Drop old vendor policies
DROP POLICY "Vendors can view messages on own property complaints" ON public.ticket_messages;
DROP POLICY "Vendors can insert messages on own property complaints" ON public.ticket_messages;

-- Recreate with is_partner_or_employee_of() + mess support
CREATE POLICY "Vendors can view messages on own property complaints"
ON public.ticket_messages FOR SELECT TO authenticated
USING (
  ticket_type = 'complaint' AND EXISTS (
    SELECT 1 FROM complaints c
    WHERE c.id = ticket_messages.ticket_id
    AND (
      EXISTS (SELECT 1 FROM cabins cab WHERE cab.id = c.cabin_id AND is_partner_or_employee_of(cab.created_by))
      OR EXISTS (SELECT 1 FROM hostels h WHERE h.id = c.hostel_id AND is_partner_or_employee_of(h.created_by))
      OR EXISTS (SELECT 1 FROM mess_partners mp WHERE mp.id = c.mess_id AND is_partner_or_employee_of(mp.user_id))
    )
  )
);

CREATE POLICY "Vendors can insert messages on own property complaints"
ON public.ticket_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND ticket_type = 'complaint'
  AND EXISTS (
    SELECT 1 FROM complaints c
    WHERE c.id = ticket_messages.ticket_id
    AND (
      EXISTS (SELECT 1 FROM cabins cab WHERE cab.id = c.cabin_id AND is_partner_or_employee_of(cab.created_by))
      OR EXISTS (SELECT 1 FROM hostels h WHERE h.id = c.hostel_id AND is_partner_or_employee_of(h.created_by))
      OR EXISTS (SELECT 1 FROM mess_partners mp WHERE mp.id = c.mess_id AND is_partner_or_employee_of(mp.user_id))
    )
  )
);
