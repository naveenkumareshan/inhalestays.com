
-- Indexes for common booking queries
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_bookings_cabin_id ON bookings(cabin_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_hostel_bookings_status ON hostel_bookings(status);
CREATE INDEX IF NOT EXISTS idx_hostel_bookings_user_id ON hostel_bookings(user_id);

-- Dashboard stats RPC (replaces 4+ client-side full-table scans)
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_bookings', (SELECT count(*) FROM bookings),
    'completed_bookings', (SELECT count(*) FROM bookings WHERE payment_status = 'completed'),
    'pending_bookings', (SELECT count(*) FROM bookings WHERE payment_status = 'pending'),
    'cancelled_bookings', (SELECT count(*) FROM bookings WHERE payment_status = 'cancelled'),
    'total_revenue', (SELECT coalesce(sum(total_price), 0) FROM bookings WHERE payment_status = 'completed'),
    'today_revenue', (SELECT coalesce(sum(total_price), 0) FROM bookings WHERE payment_status = 'completed' AND created_at::date = CURRENT_DATE),
    'active_residents', (SELECT count(*) FROM bookings WHERE payment_status = 'completed' AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE),
    'total_capacity', (SELECT coalesce(sum(capacity), 0) FROM cabins WHERE is_active = true),
    'available_seats', (SELECT count(*) FROM seats WHERE is_available = true),
    'current_year', EXTRACT(YEAR FROM now())::integer
  );
$$;
