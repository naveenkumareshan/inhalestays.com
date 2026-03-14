
-- 1. Create hostel_mess_links table
CREATE TABLE public.hostel_mess_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id uuid NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE,
  mess_id uuid NOT NULL REFERENCES public.mess_partners(id) ON DELETE CASCADE,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(hostel_id, mess_id)
);

-- RLS
ALTER TABLE public.hostel_mess_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on hostel_mess_links"
ON public.hostel_mess_links FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Partner access own hostel_mess_links"
ON public.hostel_mess_links FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.hostels h
    WHERE h.id = hostel_mess_links.hostel_id
    AND public.is_partner_or_employee_of(h.created_by)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.hostels h
    WHERE h.id = hostel_mess_links.hostel_id
    AND public.is_partner_or_employee_of(h.created_by)
  )
);

-- Trigger: unset other defaults when setting one as default
CREATE OR REPLACE FUNCTION public.unset_other_default_mess_links()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.hostel_mess_links
    SET is_default = false
    WHERE hostel_id = NEW.hostel_id AND id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_unset_other_default_mess_links
BEFORE INSERT OR UPDATE ON public.hostel_mess_links
FOR EACH ROW EXECUTE FUNCTION public.unset_other_default_mess_links();

-- 2. Add source_type and hostel_booking_id to mess_subscriptions
ALTER TABLE public.mess_subscriptions
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS hostel_booking_id uuid REFERENCES public.hostel_bookings(id) ON DELETE SET NULL;

-- 3. Make package_id nullable
ALTER TABLE public.mess_subscriptions ALTER COLUMN package_id DROP NOT NULL;
