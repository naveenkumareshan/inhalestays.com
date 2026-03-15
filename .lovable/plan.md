

## Fix Complaints: Missing FK, Partner Scoping, Property & Booking Details

### Issues Found

1. **`ticket_messages` has zero foreign keys** -- the `profiles:sender_id(name)` join returns 400 on every message load (both partner and student sides). This is why no chat threads are visible.

2. **`complaints.hostel_id` has no FK to `hostels`** -- can't join hostel names in the query.

3. **Partner scoping missing** -- `ComplaintsManagement.tsx` fetches ALL complaints (`select *`) without filtering by partner's properties. Partners see every complaint across the platform.

4. **No property/booking details shown** -- the complaints table (both admin and partner views) doesn't display property name, floor/seat/bed, or booking serial number.

---

### Changes

#### 1. Database Migration
- Add FK `ticket_messages.sender_id → profiles.id` (fixes 400 error on all chat views)
- Add FK `complaints.hostel_id → hostels.id ON DELETE SET NULL` (enables hostel name joins)

#### 2. `ComplaintsManagement.tsx` -- Partner Scoping + Property Details
- Use `getEffectiveOwnerId` to detect if current user is a partner/employee
- Check `user_roles` for admin role; admins see all complaints, partners see only their property complaints
- Update query to join: `cabins:cabin_id(name)`, `hostels:hostel_id(name)`, `mess_partners:mess_id(name)`, `bookings:booking_id(serial_number, seat_number, seats:seat_id(number, floor))`
- For partners: filter complaints client-side by matching `cabin_id`, `hostel_id`, or `mess_id` against the partner's owned properties (fetched via separate queries)
- Add columns to the table: **Property Name**, **Booking #**, **Location** (floor/seat/bed)
- Show same details in the complaint detail dialog

#### 3. `ComplaintTracker.tsx` (Operations Hub - admin only)
- Update query to include property and booking joins same as above
- Add Property and Booking columns to the table
- Show property details in the chat dialog header

### Files to Modify
- **Database migration** -- 2 foreign keys
- `src/components/admin/ComplaintsManagement.tsx` -- scoping + property details
- `src/components/admin/operations/ComplaintTracker.tsx` -- property details in table

