

# Fix Reconciliation: Remove Bulk Select & Resolve Payment Method Labels

## Problem
1. **Bulk selection checkboxes** on the pending tab add confusion — users might skip selecting a date/bank. Remove checkboxes and bulk approve entirely.
2. **Payment Method column** shows raw `custom_<uuid>` strings instead of the actual bank/payment labels added by the partner.

## Changes — Single File: `src/pages/admin/Reconciliation.tsx`

### 1. Remove Multi-Selection
- Remove `selected` state, `toggleSelectAll`, `allPageSelected` logic
- Remove the checkbox column from the table header and rows
- Remove the "X selected / Approve Selected / Clear" bulk action bar
- Remove `handleBulkApprove` function

### 2. Resolve Payment Method Labels
After fetching all receipts and building `allData`, collect all unique `payment_method` values that start with `custom_`, then query `partner_payment_modes` to get their labels. Store in a map and use it when building `ReconciliationRow[]`.

```typescript
// After allData is built:
const customMethods = [...new Set(allData.map(r => r.payment_method).filter(m => m?.startsWith('custom_')))];
const customIds = customMethods.map(m => m.replace('custom_', ''));
let methodLabels: Record<string, string> = {};
if (customIds.length > 0) {
  const { data } = await supabase.from('partner_payment_modes').select('id, label').in('id', customIds);
  data?.forEach(m => { methodLabels[`custom_${m.id}`] = m.label; });
}

// In the mapping:
payment_method: methodLabels[r.payment_method] || DEFAULT_METHOD_LABELS[r.payment_method] || r.payment_method,
```

This resolves `custom_bdeea704-...` → actual label like "ICICI Bank 303" everywhere: table, mobile cards, and CSV export.

### 3. Auto-close credit date picker
The approve dialog's credit date Popover is missing controlled `open` state (missed in earlier pass). Add it.

