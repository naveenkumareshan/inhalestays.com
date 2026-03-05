-- 1. Create reusable helper function
CREATE OR REPLACE FUNCTION public.is_partner_or_employee_of(owner_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM public.vendor_employees
      WHERE employee_user_id = auth.uid()
        AND partner_user_id = owner_id
        AND status = 'active'
    )
$$;

-- 2. CABINS: Employee can SELECT employer's cabins
CREATE POLICY "Employees can view employer cabins"
  ON public.cabins FOR SELECT TO authenticated
  USING (
    is_partner_or_employee_of(created_by)
  );

-- 3. HOSTELS: Employee can SELECT employer's hostels
CREATE POLICY "Employees can view employer hostels"
  ON public.hostels FOR SELECT TO authenticated
  USING (
    is_partner_or_employee_of(created_by)
  );

-- 4. BOOKINGS: Employee can SELECT/UPDATE employer's bookings
CREATE POLICY "Employees can view employer bookings"
  ON public.bookings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cabins c
      WHERE c.id = bookings.cabin_id
        AND is_partner_or_employee_of(c.created_by)
    )
  );

CREATE POLICY "Employees can update employer bookings"
  ON public.bookings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cabins c
      WHERE c.id = bookings.cabin_id
        AND is_partner_or_employee_of(c.created_by)
    )
  );

CREATE POLICY "Employees can insert employer bookings"
  ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cabins c
      WHERE c.id = bookings.cabin_id
        AND is_partner_or_employee_of(c.created_by)
    )
  );

-- 5. DUES: Drop broken employee policy, create correct one
DROP POLICY IF EXISTS "Vendor employees can manage dues for employer cabins" ON public.dues;

CREATE POLICY "Employees can manage employer dues"
  ON public.dues FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cabins c
      WHERE c.id = dues.cabin_id
        AND is_partner_or_employee_of(c.created_by)
    )
  );

-- 6. DUE_PAYMENTS: Employee can manage employer's due payments
CREATE POLICY "Employees can manage employer due payments"
  ON public.due_payments FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dues d
      JOIN cabins c ON c.id = d.cabin_id
      WHERE d.id = due_payments.due_id
        AND is_partner_or_employee_of(c.created_by)
    )
  );

-- 7. COMPLAINTS: Employee can view/update employer's complaints
CREATE POLICY "Employees can view employer complaints"
  ON public.complaints FOR SELECT TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM cabins c WHERE c.id = complaints.cabin_id AND is_partner_or_employee_of(c.created_by)))
    OR
    (EXISTS (SELECT 1 FROM hostels h WHERE h.id = complaints.hostel_id AND is_partner_or_employee_of(h.created_by)))
  );

CREATE POLICY "Employees can update employer complaints"
  ON public.complaints FOR UPDATE TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM cabins c WHERE c.id = complaints.cabin_id AND is_partner_or_employee_of(c.created_by)))
    OR
    (EXISTS (SELECT 1 FROM hostels h WHERE h.id = complaints.hostel_id AND is_partner_or_employee_of(h.created_by)))
  );

-- 8. HOSTEL_BOOKINGS: Employee can view/manage employer's hostel bookings
CREATE POLICY "Employees can view employer hostel bookings"
  ON public.hostel_bookings FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM hostels h WHERE h.id = hostel_bookings.hostel_id AND is_partner_or_employee_of(h.created_by))
  );

CREATE POLICY "Employees can update employer hostel bookings"
  ON public.hostel_bookings FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM hostels h WHERE h.id = hostel_bookings.hostel_id AND is_partner_or_employee_of(h.created_by))
  );

-- 9. HOSTEL_DUES: Employee can manage employer's hostel dues
CREATE POLICY "Employees can manage employer hostel dues"
  ON public.hostel_dues FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM hostels h WHERE h.id = hostel_dues.hostel_id AND is_partner_or_employee_of(h.created_by))
  );

-- 10. HOSTEL_DUE_PAYMENTS: Employee can manage employer's hostel due payments
CREATE POLICY "Employees can manage employer hostel due payments"
  ON public.hostel_due_payments FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hostel_dues d
      JOIN hostels h ON h.id = d.hostel_id
      WHERE d.id = hostel_due_payments.due_id
        AND is_partner_or_employee_of(h.created_by)
    )
  );

-- 11. HOSTEL_RECEIPTS: Employee can manage employer's hostel receipts
CREATE POLICY "Employees can manage employer hostel receipts"
  ON public.hostel_receipts FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM hostels h WHERE h.id = hostel_receipts.hostel_id AND is_partner_or_employee_of(h.created_by))
  );
