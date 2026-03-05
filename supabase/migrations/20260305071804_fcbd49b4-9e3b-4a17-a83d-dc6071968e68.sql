CREATE POLICY "Employees can view own record"
ON public.vendor_employees
FOR SELECT
USING (employee_user_id = auth.uid());