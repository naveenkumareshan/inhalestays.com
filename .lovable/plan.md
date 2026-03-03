
# Multi-Point Fix: Partner Data Isolation, Settlement Export, Partner Statement, and Decimal Formatting

## 1. Partner Data Isolation -- Complaints, Users, Settlements, Deposits, Employees

**Problem**: Partners can currently see all complaints, all users/students, and all settlements instead of only data related to their own properties.

**Solution**: RLS policies already restrict data for partners on `complaints`, `hostel_bookings`, `bookings`, etc. The queries themselves just need to not override RLS. Most queries already go through `supabase.from(...)` which respects RLS. However, a few pages need explicit ownership filters:

### Complaints (`ComplaintsManagement.tsx`)
- The RLS policy "Vendors can view complaints for own properties" already filters by `cabin.created_by` and `hostel.created_by`. The query `supabase.from('complaints').select(...)` will naturally return only the partner's complaints via RLS.
- **No code change needed** -- RLS handles this correctly. Verify by testing.

### Students/Users (`AdminStudents.tsx`)
- Partners should only see students who have bookings at their properties. This requires filtering students by their booking associations.
- Add a check: if user role is not admin/super_admin, fetch students who have bookings in the partner's cabins or hostels.
- Query the partner's cabin/hostel IDs, then filter profiles by `user_id IN (bookings for those properties)`.

### Settlements (`PartnerSettlements.tsx` -- partner view)
- Partners use `PartnerEarnings.tsx` which already filters by `partner_id` -- this is correct.
- The admin `PartnerSettlements.tsx` is admin-only, so no change needed.

### Deposits
- Already handled in the previous partner isolation fix (HostelDeposits uses `created_by` filter).

### Employees
- `vendorEmployeeService.ts` already filters by `partner_user_id = user.id` -- correct.

**Files to modify**: `src/pages/AdminStudents.tsx` -- add partner-specific student filtering.

## 2. Admin Settlement Table -- Show Bank Details + Export for Bank Upload

**Problem**: The admin settlement table doesn't show partner bank details (Name, Account Number, IFSC) and lacks a bank-uploadable export.

**Solution**:

### Table Changes (`PartnerSettlements.tsx`)
- Add 3 columns after "Partner": Account Holder Name, Account Number, IFSC Code
- Data is already fetched via `partners!inner(business_name, contact_person, email, bank_details)` join
- Access via `s.partners?.bank_details?.accountHolderName`, `s.partners?.bank_details?.accountNumber`, `s.partners?.bank_details?.ifscCode`

### Bank Transfer Export
- Add an "Export for Bank" button that generates a CSV with columns matching standard bank upload format:
  - Beneficiary Name, Account Number, IFSC Code, Amount (Net Payable), UTR/Reference, Payment Mode, Settlement ID, Period
- Only include settlements with status "approved" or "locked" (ready for payment)
- Use the existing ExcelJS dependency for clean export

**Files to modify**: `src/pages/admin/PartnerSettlements.tsx`

## 3. Partner Earnings -- Settlement Statement Popup + Download

**Problem**: Partners can see settlement list but can't view a detailed statement or download it.

**Solution**:

### Statement Popup (`PartnerEarnings.tsx`)
- Enhance the existing "Eye" button click to show a full statement dialog (similar to `SettlementDetailDialog`)
- Include: settlement summary (total collected, commission, gateway fees, adjustments, TDS, security hold, net payable), plus receipt-level breakdown table
- Add a "Download Statement" button inside the popup

### Download Statement
- Generate a CSV/Excel file containing:
  - Header: Settlement ID, Period, Partner Name, Date
  - Summary: Total Collected, Commission, Gateway Fees, Adjustments, Net Payable
  - Items table: S.No, Receipt ID, Type, Module, Student, Property, Payment Date, Amount, Commission, Gateway Fee, Net Amount
  - Footer: Totals

**Files to modify**: `src/pages/partner/PartnerEarnings.tsx`, `src/api/partnerEarningsService.ts`

## 4. Settlement Cycle Automation Confirmation

The settlement generation already uses `period_start` and `period_end` dates. The `partner_payout_settings` table has a `settlement_cycle` field (weekly, biweekly, monthly, custom). The current generate dialog allows manual period selection. The settlement list is already sorted by `created_at` descending, so settlements follow the admin's generation cycle. **No code change needed** -- this is already working as designed.

## 5. All Amounts -- Max 2 Decimal Places

**Problem**: Amounts displayed with `toLocaleString()` may show inconsistent decimals. The `formatCurrency()` utility already limits to 2 decimals, but many places use raw `toLocaleString()`.

**Solution**:
- Replace all `toLocaleString()` amount displays with `formatCurrency()` across all affected files
- Update `roundPrice()` calls in settlement generation to ensure calculated values are rounded before storage
- Key files to update:
  - `src/pages/admin/PartnerSettlements.tsx`
  - `src/pages/partner/PartnerEarnings.tsx`
  - `src/components/admin/SettlementDetailDialog.tsx`
  - `src/api/settlementService.ts` (round calculated amounts before insert)

## Files to Modify Summary

| File | Changes |
|------|---------|
| `src/pages/AdminStudents.tsx` | Filter students by partner's property bookings for non-admin users |
| `src/pages/admin/PartnerSettlements.tsx` | Add bank detail columns + "Export for Bank" button |
| `src/pages/partner/PartnerEarnings.tsx` | Enhanced statement popup with download option, use `formatCurrency()` |
| `src/api/partnerEarningsService.ts` | Add method to fetch full settlement detail for partner view |
| `src/components/admin/SettlementDetailDialog.tsx` | Use `formatCurrency()` for all amounts |
| `src/api/settlementService.ts` | Round all calculated amounts with `roundPrice()` before DB insert |

## Technical Details

- Bank details are stored as JSONB in `partners.bank_details` with keys: `accountHolderName`, `accountNumber`, `ifscCode`, `bankName`
- The `formatCurrency()` from `src/utils/currency.ts` formats with INR symbol and max 2 decimals
- The `roundPrice()` utility rounds to 2 decimal places using `Math.round((amount + Number.EPSILON) * 100) / 100`
- ExcelJS (already installed) will be used for the bank export CSV generation
- Partner earnings statement reuses the same `settlement_items` table data already queried by `getMySettlementItems()`
