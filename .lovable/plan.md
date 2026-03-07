

# Create Bank Management Page Under Finance

## Overview
Create a new "Banks" page under the Finance sidebar section that consolidates all bank-related features: bank creation/management (currently in vendor settings as PaymentModesManager) and bank-wise balance summaries computed from approved receipts across all 4 modules.

## Changes

### 1. New page: `src/pages/admin/BankManagement.tsx`

**Section A — Bank Accounts Management**
- Embed existing `PaymentModesManager` component (or replicate its logic) so partners can add/edit/delete bank accounts (from `partner_payment_modes` table) directly from this page.

**Section B — Bank-wise Balance Summary**
- Query all 4 receipt tables (`receipts`, `hostel_receipts`, `mess_receipts`, `laundry_receipts`) where `reconciliation_status = 'approved'`.
- Group by `reconciled_bank_name` and sum amounts to show per-bank totals.
- Display as a card grid or table:
  - Bank Name | Total Credited | Receipt Count
- Show a prominent **Total Bank Balance** card at the top summing all approved receipts.

### 2. Update `src/components/admin/AdminSidebar.tsx`
- Add "Banks" sub-item under Finance section (below Reconciliation):
  ```
  { title: 'Banks', url: `${routePrefix}/banks`, icon: Building2 }
  ```

### 3. Update `src/App.tsx`
- Add lazy import and route for `/admin/banks` and `/partner/banks` pointing to the new page.

### Files
- **Create**: `src/pages/admin/BankManagement.tsx`
- **Edit**: `src/components/admin/AdminSidebar.tsx` (add sidebar link)
- **Edit**: `src/App.tsx` (add route)

No database changes needed — all data comes from existing `partner_payment_modes` and receipt tables.

