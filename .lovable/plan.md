

# Finance Reconciliation — Credit Date, Bank Name & Status Toggle

## Changes

### 1. Database Migration
Add columns to all 4 receipt tables (`receipts`, `hostel_receipts`, `mess_receipts`, `laundry_receipts`):
- `credit_date date` — the date money was credited to bank
- `reconciled_bank_name text` — the bank name selected during approval

### 2. Approve Dialog (replaces direct approve)
Currently, clicking "Approve" calls `handleApprove` directly. Replace with an **Approve Dialog** that shows:
- **Credit Date** picker (required, defaults to today, auto-closes on select)
- **Bank Name** dropdown populated from `partner_payment_modes` for the property's partner (filtered to bank-type entries)
- Confirm button saves `reconciliation_status = 'approved'`, `credit_date`, `reconciled_bank_name`, `reconciled_at`, `reconciled_by`

### 3. Show Credit Date & Bank on Approved Tab
Add two columns to the Approved tab table: **Credit Date** and **Bank Name**. Also add these fields to the mobile card view and CSV export.

### 4. Status Toggle — Move Between Approved/Rejected
On the **Approved** tab, add a "Reject" button on each row (moves it back to rejected with a reason dialog).
On the **Rejected** tab, add an "Approve" button on each row (opens the approve dialog with credit date + bank selection).
Both tabs get action columns, reusing the same approve dialog and reject dialog.

### 5. ReconciliationRow Interface Update
Add `credit_date?: string` and `reconciled_bank_name?: string` to the interface, and fetch these fields in the query.

### Files

| File | Change |
|---|---|
| DB Migration | Add `credit_date`, `reconciled_bank_name` to 4 tables |
| `src/pages/admin/Reconciliation.tsx` | Approve dialog with date+bank, show on approved tab, action buttons on all tabs |

