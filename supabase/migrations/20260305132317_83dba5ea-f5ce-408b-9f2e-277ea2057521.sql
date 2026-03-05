
-- Employee can insert hostel bookings for employer's hostels
CREATE POLICY "Employees can insert employer hostel bookings"
ON public.hostel_bookings FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM hostels h
  WHERE h.id = hostel_bookings.hostel_id
  AND is_partner_or_employee_of(h.created_by)
));

-- Employee can manage employer's hostel beds (UPDATE/DELETE)
CREATE POLICY "Employees can manage employer hostel beds"
ON public.hostel_beds FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM hostel_rooms r
  JOIN hostels h ON h.id = r.hostel_id
  WHERE r.id = hostel_beds.room_id
  AND is_partner_or_employee_of(h.created_by)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM hostel_rooms r
  JOIN hostels h ON h.id = r.hostel_id
  WHERE r.id = hostel_beds.room_id
  AND is_partner_or_employee_of(h.created_by)
));
