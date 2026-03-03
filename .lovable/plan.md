

# Rewrite Student Import for Both Reading Rooms and Hostels

## Current Problem
The student import currently:
- Uses `axios` calling `localhost:5000/api/admin/bookings/bulk-create` -- a legacy API that does not exist
- Only supports Reading Room (cabin) bookings
- Template has fields specific to reading rooms only
- The import will always fail because the backend endpoint doesn't exist

## Solution
Rewrite `StudentExcelImport.tsx` and `bulkBookingService.ts` to use Supabase directly, supporting both Reading Rooms and Hostels.

## Property Type Selection
Add a **property type selector** (Reading Room / Hostel) at the top. Based on selection, show:
- For **Reading Room**: cabin selector, floor selector
- For **Hostel**: hostel selector (then rooms/beds are referenced by room_number and bed_number in the Excel)

## Template Fields

### Reading Room Template
| Column | Required | Description |
|--------|----------|-------------|
| name | Yes | Student name |
| email | Yes | Email (auto-generated from phone if blank) |
| phone | Yes | Phone number |
| amount | Yes | Booking fee |
| key_deposite | No | Locker/key deposit |
| startDate | Yes | Start date (DD-MM-YYYY) |
| endDate | Yes | End date (DD-MM-YYYY) |
| seat_no | Yes | Seat number |
| room_name | Yes | Room/floor name |
| status | No | Booking status (default: booked) |
| receipt_no | No | Receipt reference |
| transaction_id | Yes | Payment reference |
| pay_mode | No | Payment method (Cash/UPI/etc.) |

### Hostel Template
| Column | Required | Description |
|--------|----------|-------------|
| name | Yes | Student name |
| email | Yes | Email |
| phone | Yes | Phone number |
| amount | Yes | Total rent amount |
| security_deposit | No | Security deposit |
| startDate | Yes | Start date |
| endDate | Yes | End date |
| room_number | Yes | Room number (matches hostel_rooms.room_number) |
| bed_number | Yes | Bed number (matches hostel_beds.bed_number) |
| transaction_id | Yes | Payment reference |
| pay_mode | No | Payment method |
| receipt_no | No | Receipt reference |

## Processing Logic (Supabase-direct)

For each student row:
1. **Create user** via `create-student` edge function (already exists) -- creates auth user + profile
2. **Create booking**:
   - **Reading Room**: Insert into `bookings` table with seat lookup by `seat_no` + `room_name` within the selected cabin/floor
   - **Hostel**: Lookup `hostel_rooms` by `room_number`, then `hostel_beds` by `bed_number` within that room, insert into `hostel_bookings`, create `hostel_receipts`, mark bed unavailable
3. **Create receipt**: Insert into receipts table with payment details
4. Report success/failure per student row

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/admin/StudentExcelImport.tsx` | Full rewrite: add property type toggle, separate templates for RR/Hostel, Supabase-direct processing loop |
| `src/api/bulkBookingService.ts` | Rewrite to use Supabase client instead of axios; add hostel bulk booking methods; fix validation for both types |

## Technical Details

- The `create-student` edge function is reused to create user accounts (handles existing users gracefully)
- For Reading Room: seats are looked up via `supabase.from('seats').select('id').eq('cabin_id', cabinId).eq('number', seatNo)`
- For Hostel: rooms are looked up via `hostel_rooms.room_number`, beds via `hostel_beds.bed_number` within that room
- Processing is sequential per student (to avoid race conditions on seat/bed availability)
- Date parsing handles both Excel serial numbers and string formats (DD-MM-YYYY)
- All amounts use `formatCurrency()` with max 2 decimals
- Partner-scoped: if the logged-in user is a partner, only their properties are shown in the selector

