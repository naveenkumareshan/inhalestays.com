

# Plan: Share Button for Partner Properties + Business Performance Breakdown

## 1. Add Share Button to Partner Property Management

**Problem**: Partners/employees cannot share their property details. Students already have share functionality via `ShareButton` + `shareUtils`.

**Solution**: Add share buttons to property cards in both management views.

### Files to Change

**`src/components/admin/CabinManagement.tsx`** (Reading Room cards):
- Import `ShareButton` and `generateCabinShareText`
- Add a Share button to each cabin card's action row (next to Edit, Activate, etc.)
- Uses the same link format as student view (`/book-seat/{serialNumber}`)

**`src/components/admin/HostelItem.tsx`** (Hostel cards):
- Import `ShareButton` and `generateHostelShareText`
- Add a Share button to the actions row
- Uses the same link format as student view (`/hostels/{serial_number}`)

Both will use `useAuth` to pass `user?.id` for referral tracking, matching student behavior exactly.

---

## 2. Business Performance: Add Available Seats + Split Fee Boxes

**Problem**: 
- "Available Seats" card is missing from summary
- "Fees Collected" lumps everything together instead of showing Seat Fees, Locker Amount, Bed Fees, Security Deposit separately

**Solution**:

### `src/hooks/usePartnerPerformance.ts`:
- Add new fields to `PerformanceData`: `seatFees`, `lockerAmount`, `bedFees`, `securityDeposit`, `availableSeats` (and `prev*` variants for growth)
- Split the current `roomFees` calculation:
  - `seatFees` = RR `booking_payment` receipts only
  - `bedFees` = Hostel `booking_payment` receipts only
  - `lockerAmount` = RR `locker_payment` receipts (+ hostel if applicable)
  - `securityDeposit` = receipts with type `deposit` or `security_deposit`
- Compute `availableSeats = totalSeats - occupiedSeats`

### `src/pages/partner/BusinessPerformance.tsx`:
- Replace the single "Fees Collected" + "Deposits Collected" cards with 4 separate cards:
  1. Seat Fees (reading room booking payments)
  2. Locker Amount
  3. Bed Fees (hostel booking payments)  
  4. Security Deposit
- Add "Available Seats/Beds" summary card to the first row
- Update Revenue Breakdown table to show: Seat Fees, Bed Fees, Locker Amount, Security Deposit, Food Collection, Due Payments, Total Revenue

### Files to Change

| File | Change |
|------|--------|
| `src/components/admin/CabinManagement.tsx` | Add ShareButton per cabin card |
| `src/components/admin/HostelItem.tsx` | Add ShareButton per hostel card |
| `src/hooks/usePartnerPerformance.ts` | Split fees into seat/bed/locker/deposit; add availableSeats |
| `src/pages/partner/BusinessPerformance.tsx` | Show 4 fee boxes + available seats card + updated revenue breakdown |

