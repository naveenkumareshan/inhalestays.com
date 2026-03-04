
CREATE OR REPLACE FUNCTION public.get_partner_dashboard_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'total_bookings', (SELECT count(*) FROM bookings WHERE cabin_id IN (SELECT id FROM cabins WHERE created_by = p_user_id)),
    'completed_bookings', (SELECT count(*) FROM bookings WHERE payment_status = 'completed' AND cabin_id IN (SELECT id FROM cabins WHERE created_by = p_user_id)),
    'pending_bookings', (SELECT count(*) FROM bookings WHERE payment_status = 'pending' AND cabin_id IN (SELECT id FROM cabins WHERE created_by = p_user_id)),
    'cancelled_bookings', (SELECT count(*) FROM bookings WHERE payment_status = 'cancelled' AND cabin_id IN (SELECT id FROM cabins WHERE created_by = p_user_id)),
    'total_revenue', (SELECT coalesce(sum(total_price), 0) FROM bookings WHERE payment_status = 'completed' AND cabin_id IN (SELECT id FROM cabins WHERE created_by = p_user_id)),
    'today_revenue', (SELECT coalesce(sum(total_price), 0) FROM bookings WHERE payment_status = 'completed' AND created_at::date = CURRENT_DATE AND cabin_id IN (SELECT id FROM cabins WHERE created_by = p_user_id)),
    'active_residents', (SELECT count(*) FROM bookings WHERE payment_status = 'completed' AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE AND cabin_id IN (SELECT id FROM cabins WHERE created_by = p_user_id)),
    'total_capacity', (SELECT coalesce(sum(capacity), 0) FROM cabins WHERE is_active = true AND created_by = p_user_id),
    'available_seats', (SELECT count(*) FROM seats WHERE is_available = true AND cabin_id IN (SELECT id FROM cabins WHERE created_by = p_user_id)),
    'current_year', EXTRACT(YEAR FROM now())::integer
  );
$$;
