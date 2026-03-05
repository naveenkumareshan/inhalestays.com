
-- Create student_property_links table
CREATE TABLE public.student_property_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  partner_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_user_id, partner_user_id)
);

ALTER TABLE public.student_property_links ENABLE ROW LEVEL SECURITY;

-- Partners/employees can read their own links
CREATE POLICY "Partners read own links" ON public.student_property_links
  FOR SELECT USING (is_partner_or_employee_of(partner_user_id));

-- Partners/employees can insert their own links
CREATE POLICY "Partners insert own links" ON public.student_property_links
  FOR INSERT WITH CHECK (is_partner_or_employee_of(partner_user_id));

-- Admins full access
CREATE POLICY "Admins manage all links" ON public.student_property_links
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
