CREATE OR REPLACE FUNCTION public.check_duplicate_transaction_id(p_txn_id text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM bookings WHERE transaction_id = p_txn_id AND transaction_id != ''
    UNION ALL
    SELECT 1 FROM receipts WHERE transaction_id = p_txn_id AND transaction_id != ''
    UNION ALL
    SELECT 1 FROM hostel_bookings WHERE transaction_id = p_txn_id AND transaction_id != ''
    UNION ALL
    SELECT 1 FROM hostel_receipts WHERE transaction_id = p_txn_id AND transaction_id != ''
    UNION ALL
    SELECT 1 FROM due_payments WHERE transaction_id = p_txn_id AND transaction_id != ''
    UNION ALL
    SELECT 1 FROM hostel_due_payments WHERE transaction_id = p_txn_id AND transaction_id != ''
  );
$$;