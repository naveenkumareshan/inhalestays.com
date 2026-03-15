
-- Add new columns to laundry_partners
ALTER TABLE public.laundry_partners
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC,
  ADD COLUMN IF NOT EXISTS service_radius_km NUMERIC DEFAULT 3,
  ADD COLUMN IF NOT EXISTS delivery_time_hours INTEGER DEFAULT 48,
  ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS operating_hours JSONB;

-- Add partner_id to laundry_items
ALTER TABLE public.laundry_items
  ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES public.laundry_partners(id);

-- Add partner_id to laundry_pickup_slots
ALTER TABLE public.laundry_pickup_slots
  ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES public.laundry_partners(id);

-- RLS: Allow partners to manage their own items
CREATE POLICY "Partners can manage own items"
ON public.laundry_items
FOR ALL
TO authenticated
USING (
  partner_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.laundry_partners lp
    WHERE lp.id = laundry_items.partner_id
    AND public.is_partner_or_employee_of(lp.user_id)
  )
)
WITH CHECK (
  partner_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.laundry_partners lp
    WHERE lp.id = laundry_items.partner_id
    AND public.is_partner_or_employee_of(lp.user_id)
  )
);

-- RLS: Allow partners to manage their own pickup slots
CREATE POLICY "Partners can manage own slots"
ON public.laundry_pickup_slots
FOR ALL
TO authenticated
USING (
  partner_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.laundry_partners lp
    WHERE lp.id = laundry_pickup_slots.partner_id
    AND public.is_partner_or_employee_of(lp.user_id)
  )
)
WITH CHECK (
  partner_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.laundry_partners lp
    WHERE lp.id = laundry_pickup_slots.partner_id
    AND public.is_partner_or_employee_of(lp.user_id)
  )
);

-- RLS: Allow partners to manage their own laundry_partners record
CREATE POLICY "Partners can manage own partner record"
ON public.laundry_partners
FOR ALL
TO authenticated
USING (public.is_partner_or_employee_of(user_id))
WITH CHECK (public.is_partner_or_employee_of(user_id));
