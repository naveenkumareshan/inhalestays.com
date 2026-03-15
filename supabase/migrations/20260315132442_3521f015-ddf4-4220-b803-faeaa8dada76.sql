
-- 1. Add FK: complaints.user_id → profiles.id
ALTER TABLE public.complaints
  ADD CONSTRAINT complaints_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id);

-- 2. Add FK: support_tickets.user_id → profiles.id
ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id);

-- 3. Fix vendor/employee SELECT policy on complaints to include mess_id
DROP POLICY IF EXISTS "Vendors can view own property complaints" ON public.complaints;
CREATE POLICY "Vendors can view own property complaints"
ON public.complaints FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM cabins cab WHERE cab.id = complaints.cabin_id AND is_partner_or_employee_of(cab.created_by))
  OR EXISTS (SELECT 1 FROM hostels h WHERE h.id = complaints.hostel_id AND is_partner_or_employee_of(h.created_by))
  OR EXISTS (SELECT 1 FROM mess_partners mp WHERE mp.id = complaints.mess_id AND is_partner_or_employee_of(mp.user_id))
);

-- 4. Fix vendor/employee UPDATE policy on complaints to include mess_id
DROP POLICY IF EXISTS "Vendors can update own property complaints" ON public.complaints;
CREATE POLICY "Vendors can update own property complaints"
ON public.complaints FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM cabins cab WHERE cab.id = complaints.cabin_id AND is_partner_or_employee_of(cab.created_by))
  OR EXISTS (SELECT 1 FROM hostels h WHERE h.id = complaints.hostel_id AND is_partner_or_employee_of(h.created_by))
  OR EXISTS (SELECT 1 FROM mess_partners mp WHERE mp.id = complaints.mess_id AND is_partner_or_employee_of(mp.user_id))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM cabins cab WHERE cab.id = complaints.cabin_id AND is_partner_or_employee_of(cab.created_by))
  OR EXISTS (SELECT 1 FROM hostels h WHERE h.id = complaints.hostel_id AND is_partner_or_employee_of(h.created_by))
  OR EXISTS (SELECT 1 FROM mess_partners mp WHERE mp.id = complaints.mess_id AND is_partner_or_employee_of(mp.user_id))
);
