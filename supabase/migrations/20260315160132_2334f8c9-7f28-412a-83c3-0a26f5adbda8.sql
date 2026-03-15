CREATE POLICY "Students can view active laundry partners"
  ON public.laundry_partners
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND status = 'active'
    AND is_student_visible = true
  );