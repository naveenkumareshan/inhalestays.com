CREATE POLICY "Vendors can update complaints for own properties"
ON public.complaints
FOR UPDATE
TO authenticated
USING (
  (EXISTS (SELECT 1 FROM cabins c WHERE c.id = complaints.cabin_id AND c.created_by = auth.uid()))
  OR
  (EXISTS (SELECT 1 FROM hostels h WHERE h.id = complaints.hostel_id AND h.created_by = auth.uid()))
);