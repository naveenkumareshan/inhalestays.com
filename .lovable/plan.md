

# Fix: Hostel Receipts — Collected By, Txn ID, and Date+Time

## Issues

1. **Collected By** shows `-` for online student bookings because `collected_by_name` is not set when receipts are created in `hostelBookingService.ts`
2. **Txn ID** column is combined with Notes — transaction_id is sometimes empty for online payments
3. **Date column** only shows date (`toLocaleDateString`), not time

## Changes

### 1. `src/api/hostelBookingService.ts` — Set `collected_by_name` on receipt creation

When creating a receipt during student booking, set `collected_by_name` to `'InhaleStays.com'` (matching the convention from the reading room payment verification flow) since it's an online payment.

### 2. `src/pages/admin/HostelReceipts.tsx` — Display changes

- **Collected By**: Show `'InhaleStays.com'` as fallback when `collected_by_name` is empty and `payment_method` is `'online'`
- **Txn ID**: Split into its own dedicated column, separate from Notes
- **Date**: Change from `toLocaleDateString` to `toLocaleString('en-IN')` to include time

### Files Changed
- `src/api/hostelBookingService.ts` — Add `collected_by_name: 'InhaleStays.com'` to receipt insert
- `src/pages/admin/HostelReceipts.tsx` — Date+time display, collected_by fallback logic

