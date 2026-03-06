
CREATE TABLE public.booking_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  booking_type text NOT NULL DEFAULT 'cabin',
  activity_type text NOT NULL,
  performed_by uuid,
  details jsonb DEFAULT '{}'::jsonb,
  serial_number text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view activity logs"
ON public.booking_activity_log
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert activity logs"
ON public.booking_activity_log
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE INDEX idx_booking_activity_log_booking_id ON public.booking_activity_log(booking_id);
CREATE INDEX idx_booking_activity_log_activity_type ON public.booking_activity_log(activity_type);
CREATE INDEX idx_booking_activity_log_created_at ON public.booking_activity_log(created_at DESC);
