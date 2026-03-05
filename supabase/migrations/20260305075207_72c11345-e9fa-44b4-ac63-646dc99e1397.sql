CREATE POLICY "Employees can view employer payment modes"
ON public.partner_payment_modes FOR SELECT
TO authenticated
USING (is_partner_or_employee_of(partner_user_id));