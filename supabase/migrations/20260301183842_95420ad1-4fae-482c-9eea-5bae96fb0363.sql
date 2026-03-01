
-- Create sponsored_listings table
CREATE TABLE public.sponsored_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_type text NOT NULL DEFAULT 'reading_room',
  property_id uuid NOT NULL,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  tier text NOT NULL DEFAULT 'featured',
  target_city_id uuid NOT NULL REFERENCES public.cities(id),
  target_area_ids uuid[] DEFAULT '{}',
  start_date date NOT NULL,
  end_date date NOT NULL,
  priority_rank integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create sponsored_listing_events table
CREATE TABLE public.sponsored_listing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsored_listing_id uuid NOT NULL REFERENCES public.sponsored_listings(id) ON DELETE CASCADE,
  event_type text NOT NULL DEFAULT 'impression',
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sponsored_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsored_listing_events ENABLE ROW LEVEL SECURITY;

-- RLS: Admins full CRUD on sponsored_listings
CREATE POLICY "Admins can manage all sponsored listings"
ON public.sponsored_listings FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS: Partners can view own sponsored listings
CREATE POLICY "Partners can view own sponsored listings"
ON public.sponsored_listings FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.partners p
  WHERE p.id = sponsored_listings.partner_id AND p.user_id = auth.uid()
));

-- RLS: Public can view active sponsored listings within date range
CREATE POLICY "Anyone can view active sponsored listings"
ON public.sponsored_listings FOR SELECT
USING (status = 'active' AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE);

-- RLS: Admins full CRUD on events
CREATE POLICY "Admins can manage all sponsored listing events"
ON public.sponsored_listing_events FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS: Partners can view events for own listings
CREATE POLICY "Partners can view own listing events"
ON public.sponsored_listing_events FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.sponsored_listings sl
  JOIN public.partners p ON p.id = sl.partner_id
  WHERE sl.id = sponsored_listing_events.sponsored_listing_id AND p.user_id = auth.uid()
));

-- RLS: Anyone authenticated can insert events (for impression/click tracking)
CREATE POLICY "Anyone can insert listing events"
ON public.sponsored_listing_events FOR INSERT
TO authenticated
WITH CHECK (true);

-- RLS: Anon can also insert events (for non-logged-in impressions)
CREATE POLICY "Anon can insert listing events"
ON public.sponsored_listing_events FOR INSERT
TO anon
WITH CHECK (true);

-- Auto-expire function
CREATE OR REPLACE FUNCTION public.auto_expire_sponsored_listings()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.sponsored_listings
  SET status = 'expired', updated_at = now()
  WHERE status = 'active' AND end_date < CURRENT_DATE;
  RETURN NULL;
END;
$$;

-- Updated_at trigger
CREATE TRIGGER update_sponsored_listings_updated_at
BEFORE UPDATE ON public.sponsored_listings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_sponsored_listings_city ON public.sponsored_listings(target_city_id);
CREATE INDEX idx_sponsored_listings_status ON public.sponsored_listings(status);
CREATE INDEX idx_sponsored_listing_events_listing ON public.sponsored_listing_events(sponsored_listing_id);
CREATE INDEX idx_sponsored_listing_events_type ON public.sponsored_listing_events(event_type);
