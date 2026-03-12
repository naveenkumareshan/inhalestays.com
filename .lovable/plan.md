

# Add Phone Number to All Student Display Locations

## Summary
Several booking list pages show only Name + Email but omit the phone number. The data is already fetched from the database — it's purely a display issue.

## Pages That Need Phone Added

### 1. `src/pages/AdminBookings.tsx` — Reading Room All Transactions
- **Desktop table** (Student column, ~line 207): Currently shows `name (email)` inline. Add phone below.
- **Mobile card** (~line 108-109): Shows name + email. Add phone line.

### 2. `src/pages/hotelManager/AdminHostelBookings.tsx` — Hostel Bookings
- **Desktop table** (Student column, ~line 202-204): Shows `name (email)`. Add phone below.
- Data comes from `profiles:user_id(name, email, phone)` — phone already fetched.

### 3. `src/components/admin/reports/BookingTransactions.tsx` — Transaction Reports
- Customer column (~line 54-58): Shows name + email. Add phone row.
- Also fix the export (~line 219) to include phone.

### 4. `src/components/admin/reports/ExpiringBookings.tsx` — Legacy Expiring Bookings
- Line 146: References `booking.userId?.phoneNumber` — should be `booking.userId?.phone` (field name bug).

## Pattern for the fix
Each student cell will follow this consistent pattern:
```
Name (bold)
email (muted, small)
phone (muted, small) — only if present
```

**4 files, display-only changes. No database or service changes needed.**

