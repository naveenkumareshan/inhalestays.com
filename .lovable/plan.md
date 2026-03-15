

## Fix: Laundry Order Creation Fails Due to Broken Serial Triggers

### Root Cause
The serial number triggers on `laundry_orders` and `laundry_receipts` reference `NEW.laundry_partner_id`, but the actual column name is `partner_id`. This causes the INSERT to fail with a column-not-found error, which is why nothing happens after the student clicks "Pay".

The Razorpay integration is already fully wired up in `LaundryDetail.tsx` — the flow creates an order, opens Razorpay, verifies payment, and shows a confirmation screen. The only blocker is the broken trigger.

### Fix — Database Migration

Replace both trigger functions to reference the correct column name:

```sql
CREATE OR REPLACE FUNCTION public.set_serial_laundry_orders()
  RETURNS trigger LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.serial_number IS NULL AND NEW.partner_id IS NOT NULL THEN
    NEW.serial_number := generate_property_serial(NEW.partner_id, 'laundry_partners', 'L', 'BK');
  ELSIF NEW.serial_number IS NULL THEN
    NEW.serial_number := generate_serial_number('LNDRY');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_serial_laundry_receipts()
  RETURNS trigger LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.serial_number IS NULL AND NEW.partner_id IS NOT NULL THEN
    NEW.serial_number := generate_property_serial(NEW.partner_id, 'laundry_partners', 'L', 'RC');
  ELSIF NEW.serial_number IS NULL THEN
    NEW.serial_number := generate_serial_number('LRCPT');
  END IF;
  RETURN NEW;
END;
$$;
```

### Impact
- Fixes student laundry order placement (the entire flow: select items → schedule → address → Razorpay payment → confirmation with OTP)
- Fixes laundry receipt generation after payment verification
- Property-scoped serial numbers (e.g., `IS-00015-L-BK-00001`) will now generate correctly

### Files
| File | Action |
|------|--------|
| Database migration | Fix 2 trigger functions (`partner_id` instead of `laundry_partner_id`) |

No code changes needed — `LaundryDetail.tsx` already has the complete Razorpay flow.

