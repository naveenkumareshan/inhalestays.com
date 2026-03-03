

# Add Due Amount Column to Deposit and Refund Pages

## What Changes
A new "Due Amount" column will appear next to the "Deposit" column in all deposit/refund views (Reading Room and Hostel). This shows the due amount from the due management records for that booking, helping admins/partners decide on refund actions.

## Reading Room Pages

### 1. Update `depositRefundService.ts`
- Add `dues(due_amount, paid_amount, status)` to the select join in `getDeposits()` and `getRefunds()` queries
- Add a `dueAmount` field to the `DepositRefund` interface
- In `mapToDepositRefund()`, sum `due_amount` from all linked dues records for the booking
- Add "Due Amount" to the CSV export in `exportDepositsReport()`

### 2. Update `DepositManagement.tsx` (Deposits tab)
- Add "Due Amount" column header after "Deposit"
- Show the due amount value; display in red when > 0, or "No Dues" in muted text when 0
- Update colSpan from 8 to 9

### 3. Update `RefundManagement.tsx` (Refund Pendings / Refunded tabs)
- Same "Due Amount" column addition
- Update colSpan from 9 to 10

## Hostel Pages

### 4. Update `HostelDeposits.tsx`

**In `HostelDepositList`:**
- Add `hostel_dues(due_amount, paid_amount, status)` to the select query
- Add "Due Amount" column after "Deposit"
- Sum `due_amount` from linked hostel_dues records
- Update colSpan from 8 to 9

**In `HostelRefundManagement`:**
- Same join with `hostel_dues` in the bookings query
- Add "Due Amount" column after "Deposit"
- Update colSpan from 9 to 10

## Display Format
- When due amount > 0: show in red/orange text (e.g., `₹2,500`) to flag attention
- When due amount is 0 or no dues: show "No Dues" in muted green text
- Uses existing `formatCurrency()` helper

## Files to Modify

| File | Change |
|------|--------|
| `src/api/depositRefundService.ts` | Add `dues` join, `dueAmount` field, update mapper and export |
| `src/components/admin/DepositManagement.tsx` | Add "Due Amount" column |
| `src/components/admin/RefundManagement.tsx` | Add "Due Amount" column |
| `src/pages/admin/HostelDeposits.tsx` | Add `hostel_dues` join + "Due Amount" column in both sub-components |

## Technical Details

- The `dues` table has a `booking_id` column that references `bookings.id`. The join syntax: `dues!dues_booking_id_fkey(due_amount, paid_amount, status)`
- The `hostel_dues` table has a `booking_id` column referencing `hostel_bookings.id`. Join: `hostel_dues!hostel_dues_booking_id_fkey(due_amount, paid_amount, status)`
- A booking may have multiple due records (monthly installments), so we sum all `due_amount` values
- The column shows the total due amount from the due management system, not a calculated outstanding -- exactly matching what appears in the Due Management pages

