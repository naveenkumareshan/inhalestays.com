
-- RPC: get linked hostels for a list of mess IDs (security definer bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_mess_linked_hostels(p_mess_ids uuid[])
RETURNS TABLE(mess_id uuid, hostel_id uuid, hostel_name text, is_default boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean;
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  v_is_admin := has_role(v_uid, 'admin');

  RETURN QUERY
  SELECT hml.mess_id, hml.hostel_id, h.name::text AS hostel_name, hml.is_default
  FROM hostel_mess_links hml
  JOIN hostels h ON h.id = hml.hostel_id
  WHERE hml.mess_id = ANY(p_mess_ids)
    AND (
      v_is_admin
      OR EXISTS (
        SELECT 1 FROM mess_partners mp
        WHERE mp.id = hml.mess_id
          AND is_partner_or_employee_of(mp.user_id)
      )
      OR EXISTS (
        SELECT 1 FROM hostels ht
        WHERE ht.id = hml.hostel_id
          AND is_partner_or_employee_of(ht.created_by)
      )
    );
END;
$$;

-- RPC: get linked messes for a list of hostel IDs
CREATE OR REPLACE FUNCTION public.get_hostel_linked_messes(p_hostel_ids uuid[])
RETURNS TABLE(hostel_id uuid, mess_id uuid, mess_name text, is_default boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean;
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  v_is_admin := has_role(v_uid, 'admin');

  RETURN QUERY
  SELECT hml.hostel_id, hml.mess_id, mp.name::text AS mess_name, hml.is_default
  FROM hostel_mess_links hml
  JOIN mess_partners mp ON mp.id = hml.mess_id
  WHERE hml.hostel_id = ANY(p_hostel_ids)
    AND (
      v_is_admin
      OR EXISTS (
        SELECT 1 FROM hostels ht
        WHERE ht.id = hml.hostel_id
          AND is_partner_or_employee_of(ht.created_by)
      )
      OR EXISTS (
        SELECT 1 FROM mess_partners mp2
        WHERE mp2.id = hml.mess_id
          AND is_partner_or_employee_of(mp2.user_id)
      )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_mess_linked_hostels(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_hostel_linked_messes(uuid[]) TO authenticated;
