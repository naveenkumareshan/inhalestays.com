-- Allow vendors to update bookings for their own cabins (needed for release/cancel)
CREATE POLICY "Vendors can update bookings for own cabins"
ON public.bookings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM cabins c
    WHERE c.id = bookings.cabin_id AND c.created_by = auth.uid()
  )
);
