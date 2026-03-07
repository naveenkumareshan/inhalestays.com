

# Plan: Duplicate Transaction ID Prevention

## Problem
Employees can enter the same transaction ID across bookings, enabling potential fraud. No validation exists to prevent reuse of transaction IDs across the system.

## Solution
Create a database function `check_duplicate_transaction_id` that checks across all relevant tables (`bookings`, `receipts`, `hostel_bookings`, `hostel_receipts`, `due_payments`, `hostel_due_payments`) for an existing non-empty transaction ID. Call this function from the frontend before creating any booking or collecting any due payment.

## Database Changes

**New RPC function** (`SECURITY DEFINER`):

```sql
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
```

## Frontend Changes

### 1. `src/api/vendorSeatsService.ts`
- In `createBooking` (~line 530): Before inserting, if payment method is not `cash` and `transactionId` is non-empty, call `supabase.rpc('check_duplicate_transaction_id', { p_txn_id: data.transactionId })`. If true, return error "This Transaction ID has already been used".
- In `collectDuePayment` (~line 875): Same check before inserting due payment.

### 2. `src/components/admin/operations/CheckInFinancials.tsx`
- In `handleCollect`: Before processing hostel due collection, add the same duplicate check for non-cash methods.

### 3. `src/pages/vendor/VendorSeats.tsx`
- In the hostel booking submission flow (if transaction IDs are entered there), add the same check.

All checks only apply when:
- Payment method is NOT `cash`
- Transaction ID is non-empty

Show a toast error: "This Transaction ID has already been used. Please enter a unique Transaction ID."

| File | Change |
|------|--------|
| Migration | New `check_duplicate_transaction_id` RPC function |
| `src/api/vendorSeatsService.ts` | Add duplicate check in `createBooking` and `collectDuePayment` |
| `src/components/admin/operations/CheckInFinancials.tsx` | Add duplicate check in hostel due collection |

