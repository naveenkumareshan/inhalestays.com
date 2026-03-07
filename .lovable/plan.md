

# Redesign Payment Modes — Grouped by Category with Bank Linking

## Problem
Currently payment modes are flat with a generic "type" selector. The user wants a structured hierarchy:
- **Cash**: Multiple entries, one per employee/cashier (e.g., "Cash - Ravi", "Cash - Priya")
- **Bank**: Multiple bank accounts (e.g., "ISSM ICICI 303", "ISSM Indus"), with UPI entries linked to a parent bank
- **Online**: Reserved for InhaleStays.com only — hidden from offline payment selectors

## Database Change

Add a `linked_bank_id` column to `partner_payment_modes` to allow UPI and cash entries to reference a parent bank:

```sql
ALTER TABLE partner_payment_modes ADD COLUMN linked_bank_id uuid REFERENCES partner_payment_modes(id) ON DELETE SET NULL;
```

## Changes

### 1. `src/components/vendor/PaymentModesManager.tsx` — Redesign creation form
- Replace the flat "Type" dropdown with 3 clear categories: **Add Cash Counter**, **Add Bank Account**, **Add UPI Account**
- **Cash**: Label field + auto-set `mode_type = 'cash'` (placeholder: "Employee name, e.g. Ravi")
- **Bank**: Label field + auto-set `mode_type = 'bank_transfer'` (placeholder: "e.g. ISSM ICICI 303")
- **UPI**: Label field + a **"Linked Bank"** dropdown (populated from existing bank entries) + auto-set `mode_type = 'upi'`, store `linked_bank_id`
- Remove "Online" from creation options entirely
- Display modes grouped by category with clear section headers (Cash Counters, Bank Accounts, UPI Accounts)
- Show linked bank name next to UPI entries

### 2. `src/components/vendor/PaymentMethodSelector.tsx` — Grouped offline selector
- Remove "Online" from the default modes list (it should never appear in offline payment collection)
- Remove generic "Cash", "UPI", "Bank Transfer" defaults — only show partner's custom entries
- Group radio options by category with small section headers: **Cash**, **Bank**, **UPI**
- If partner has no custom modes configured, show a message "No payment modes configured"

### 3. `src/pages/admin/BankManagement.tsx` — Update to reflect new structure
- Bank balance section stays the same (aggregates from receipts)
- The PaymentModesManager component embedded here will automatically reflect the new grouped design

### 4. `src/utils/paymentMethodLabels.ts` — No structural change needed
The `resolvePaymentMethodLabels` function already resolves `custom_<uuid>` to labels, which continues to work.

### 5. `src/pages/admin/Reconciliation.tsx` — Minor
When showing bank name during approval, if a UPI entry has a `linked_bank_id`, auto-suggest the linked bank's label as the reconciled bank name.

### Files
- **Migration**: Add `linked_bank_id` column to `partner_payment_modes`
- **Edit**: `src/components/vendor/PaymentModesManager.tsx` — grouped creation & display
- **Edit**: `src/components/vendor/PaymentMethodSelector.tsx` — grouped selector, no "Online"
- **Edit**: `src/pages/admin/Reconciliation.tsx` — auto-suggest linked bank on UPI receipts

