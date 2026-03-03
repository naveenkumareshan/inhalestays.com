

# Add Financial Details and Collect Button to Check-in Tracker

## What Changes

Each row in the Check-in Tracker (both pending and reported tables) will show inline financial summary columns and a "Collect" button when there are pending dues.

## Table Column Updates

### Reading Room Check-in Table
| S.No. | Student | Room / Seat | Start Date | Seat Price | Deposit | Paid | Due | Payment | Actions |

- **Seat Price**: `total_price` from booking (excludes locker/discount)
- **Deposit**: `locker_price` from booking
- **Paid**: Sum of all `receipts` for this booking
- **Due**: `total_price - paid` (remaining balance)

### Hostel Check-in Table
| S.No. | Student | Hostel / Bed | Start Date | Bed Price | Deposit | Paid | Due | Payment | Actions |

- **Bed Price**: `total_price` from hostel_booking
- **Deposit**: `security_deposit` from hostel_booking
- **Paid**: `advance_amount` + sum of due collections from `hostel_receipts`
- **Due**: Grand total minus paid

## Data Fetching Changes

### `CheckInTracker.tsx`
1. Expand the reading room query to also fetch the related `dues` record for each booking:
   - After fetching bookings, run a parallel query on `dues` table filtered by `booking_id` to get `total_fee`, `advance_paid`, `paid_amount`, `due_amount`
   - Also fetch `receipts` for those bookings to calculate total collected

2. Expand the hostel query similarly:
   - Fetch `hostel_dues` by `booking_id` to get financial data
   - Fetch `hostel_receipts` for those bookings

3. Alternatively (simpler approach): Query `dues`/`hostel_dues` in a single batch after bookings load, keyed by `booking_id`, and merge the financial data into each row.

## Collect Button and Flow

- Add a **"Collect"** button in the Actions column when `due > 0`
- Reuse the exact same **Sheet-based collect drawer** pattern from `DueManagement.tsx` / `HostelDueManagement.tsx`:
  - Shows: Total Fee, Advance Paid, Collected So Far, Remaining Due
  - Amount input, Payment Method radio group (Cash/UPI/Bank/Online)
  - Transaction ID (for UPI/Bank)
  - Notes
  - Confirm Collection button
  - Payment History (DuePaymentHistory / HostelDuePaymentHistory)
- On successful collection, invalidate the checkin queries

## Receipts Dialog

- Add a **Receipts** button (Receipt icon) in Actions
- Reuse the same receipts dialog pattern from `DueManagement.tsx`:
  - Serial number, badge for type (Booking/Due Collection), amount, method, date+time, collected by, txn ID, notes
  - Fetches from `receipts` table (reading room) or `hostel_receipts` table (hostel)

## ReportedTodaySection Updates

- Same column additions (Seat/Bed Price, Deposit, Paid, Due) for the reported table
- Same data fetching approach (batch dues lookup)

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/admin/operations/CheckInTracker.tsx` | Add dues/receipts queries, financial columns, Collect drawer (Sheet), Receipts dialog, Collect button in actions |
| `src/components/admin/operations/ReportedTodaySection.tsx` | Add dues queries, financial columns display |

## Technical Details

- Financial columns use `text-[11px]` with `₹` prefix and `.toLocaleString()` formatting
- Due amount > 0 shown in red; fully paid shown in green
- Collect drawer imports: `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `RadioGroup`, `RadioGroupItem`, `Label`, `Textarea`, `Separator`, payment method icons
- Reading room uses `vendorSeatsService.collectDuePayment()` for collection
- Hostel uses direct Supabase insert into `hostel_due_payments` + update `hostel_dues` (matching existing HostelDueManagement pattern)
- Receipts dialog matches the existing standardized format with serial numbers, badges, grid layout

