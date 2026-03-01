
-- 1. Add serial_number to sponsored_listings
ALTER TABLE public.sponsored_listings ADD COLUMN IF NOT EXISTS serial_number text;

-- 2. Add package_id and payment_status to sponsored_listings
ALTER TABLE public.sponsored_listings ADD COLUMN IF NOT EXISTS package_id uuid;
ALTER TABLE public.sponsored_listings ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'admin_created';

-- 3. Create sponsored_packages table
CREATE TABLE public.sponsored_packages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  tier text NOT NULL DEFAULT 'featured',
  duration_days integer NOT NULL DEFAULT 7,
  price numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  serial_number text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. FK from sponsored_listings.package_id -> sponsored_packages.id
ALTER TABLE public.sponsored_listings
  ADD CONSTRAINT sponsored_listings_package_id_fkey
  FOREIGN KEY (package_id) REFERENCES public.sponsored_packages(id);

-- 5. Create serial number trigger for sponsored_listings (prefix SPAD)
CREATE OR REPLACE FUNCTION public.set_serial_sponsored_listings()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.serial_number IS NULL THEN
    NEW.serial_number := generate_serial_number('SPAD');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_serial_sponsored_listings
  BEFORE INSERT ON public.sponsored_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_serial_sponsored_listings();

-- 6. Create serial number trigger for sponsored_packages (prefix SPKG)
CREATE OR REPLACE FUNCTION public.set_serial_sponsored_packages()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.serial_number IS NULL THEN
    NEW.serial_number := generate_serial_number('SPKG');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_serial_sponsored_packages
  BEFORE INSERT ON public.sponsored_packages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_serial_sponsored_packages();

-- 7. Backfill serial numbers for existing sponsored_listings
UPDATE public.sponsored_listings
SET serial_number = generate_serial_number('SPAD')
WHERE serial_number IS NULL;

-- 8. RLS on sponsored_packages
ALTER TABLE public.sponsored_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all packages"
  ON public.sponsored_packages FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active packages"
  ON public.sponsored_packages FOR SELECT
  USING (is_active = true);

-- 9. Add partner INSERT policy on sponsored_listings for package booking
CREATE POLICY "Partners can insert own sponsored listings"
  ON public.sponsored_listings FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'vendor'::app_role) AND
    partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
  );
