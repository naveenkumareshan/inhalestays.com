

## Fix: Missing Foreign Keys on Laundry Tables

### Root Cause
The `laundry_partners`, `laundry_orders`, and `laundry_receipts` tables all have a `user_id` column but **no foreign key** referencing `profiles(id)`. PostgREST requires FK relationships to resolve joins like `profiles:user_id(name, email, phone)`, so all these queries return 400 errors.

Other tables like `hostel_bookings` work because they have `hostel_bookings_user_id_fkey → profiles(id)`.

### Fix — Database Migration

Add foreign keys:
```sql
ALTER TABLE laundry_partners
  ADD CONSTRAINT laundry_partners_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id);

ALTER TABLE laundry_orders
  ADD CONSTRAINT laundry_orders_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id);

ALTER TABLE laundry_receipts
  ADD CONSTRAINT laundry_receipts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id);
```

No code changes needed — the queries are already correct, they just need the FK relationships to exist.

### Impact
- Fixes AdminLaundry page (partner list)
- Fixes LaundryOrders page
- Fixes LaundryOperations page
- Fixes LaundryReceipts queries
- Test data ("Fresh & Clean Laundry" with 6 items, 3 slots) will become visible

