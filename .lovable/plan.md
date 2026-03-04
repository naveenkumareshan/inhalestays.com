

# Fix: Show Partner Custom Payment Mode Labels in Business Performance

## Problem
Collections by payment mode currently shows raw keys like `custom_uuid` for partner-configured payment modes instead of their actual labels (e.g., "ICICI Bank 303"). The `getMethodDisplay` function in `BusinessPerformance.tsx` doesn't fetch custom mode labels from the database.

## Solution

### 1. Fetch partner payment modes in `usePartnerPerformance.ts`
Add a query for `partner_payment_modes` where `partner_user_id = user.id` and return the mapping as part of `PerformanceData`.

**File**: `src/hooks/usePartnerPerformance.ts`
- Add `paymentModeLabels: Record<string, string>` to `PerformanceData` interface
- Query `partner_payment_modes` table in the parallel queries block
- Build a `{ [custom_uuid]: label }` map and return it

### 2. Use labels in Business Performance dashboard
Replace the static `getMethodDisplay` with one that uses the fetched labels.

**File**: `src/pages/partner/BusinessPerformance.tsx`
- Pass `d.paymentModeLabels` into `getMethodDisplay`
- When key starts with `custom_`, look up the UUID in the labels map to show "ICICI Bank 303" instead of the raw ID

### Files Changed
- `src/hooks/usePartnerPerformance.ts` — fetch `partner_payment_modes`, return label map
- `src/pages/partner/BusinessPerformance.tsx` — resolve custom mode labels in the collections table

