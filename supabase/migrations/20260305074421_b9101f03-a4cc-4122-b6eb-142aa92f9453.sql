
-- Add employee RLS policies on receipts table
CREATE POLICY "Employees can manage employer receipts"
ON public.receipts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM cabins c
    WHERE c.id = receipts.cabin_id
    AND is_partner_or_employee_of(c.created_by)
  )
);

-- Add employee RLS policies on seat_block_history table
CREATE POLICY "Employees can view employer seat block history"
ON public.seat_block_history
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM seats s
    JOIN cabins c ON c.id = s.cabin_id
    WHERE s.id = seat_block_history.seat_id
    AND is_partner_or_employee_of(c.created_by)
  )
);
