-- 1. Partners/Employees can manage their own cabin seats
CREATE POLICY "Partners can manage own seats"
ON public.seats FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM cabins c WHERE c.id = seats.cabin_id AND is_partner_or_employee_of(c.created_by)))
WITH CHECK (EXISTS (SELECT 1 FROM cabins c WHERE c.id = seats.cabin_id AND is_partner_or_employee_of(c.created_by)));

-- 2. Partners can update their own hostel bookings
CREATE POLICY "Partners can update bookings for own hostels"
ON public.hostel_bookings FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM hostels h WHERE h.id = hostel_bookings.hostel_id AND h.created_by = auth.uid()));

-- 3. Employees can manage employer hostel rooms
CREATE POLICY "Employees can manage employer hostel rooms"
ON public.hostel_rooms FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM hostels h WHERE h.id = hostel_rooms.hostel_id AND is_partner_or_employee_of(h.created_by)))
WITH CHECK (EXISTS (SELECT 1 FROM hostels h WHERE h.id = hostel_rooms.hostel_id AND is_partner_or_employee_of(h.created_by)));