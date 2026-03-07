

# Redesign Reconciliation Summary Cards — Per-Tab Totals

## Problem
The summary section currently shows a single "Filtered Total" and "Receipts" count which only reflects the active tab. The user wants to see **all three tab totals** at a glance: Pending Amount, Approved Amount, Rejected Amount — with receipt counts for each.

## Change — `src/pages/admin/Reconciliation.tsx`

### 1. Add per-status amount computations
Compute totals for each status from all `rows` (not just `filtered`), applying date/source/search filters:

```typescript
const pendingRows = rows.filter(r => r.reconciliation_status === 'pending');
const approvedRows = rows.filter(r => r.reconciliation_status === 'approved');
const rejectedRows = rows.filter(r => r.reconciliation_status === 'rejected');
```

### 2. Redesign summary card
Replace the single "Filtered Total / Receipts" card with a 3-column layout:

| Pending Total | Approved Total | Rejected Total |
|---|---|---|
| ₹X,XX,XXX | ₹X,XX,XXX | ₹X,XX,XXX |
| 45 receipts | 126 receipts | 3 receipts |

Each section color-coded: amber/pending, green/approved, red/rejected. Highlight the active tab's card.

### 3. Keep current filtered total
Below the 3 cards, retain the existing "Filtered Total" line showing the currently filtered tab's amount and count (since filters like search/date/source may narrow results).

