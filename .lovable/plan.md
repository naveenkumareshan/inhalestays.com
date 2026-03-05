

# Fix: Vendor Employees Blocked by RLS on All Data Tables

## Root Cause

Every table's vendor RLS policy uses `created_by = auth.uid()` (or equivalent). For a vendor employee, `auth.uid()` returns **their own user ID**, not the partner's. So every query returns empty — the sidebar property detection (`usePartnerPropertyTypes`) finds no cabins, and even if we force the sidebar open, the actual pages would show no data.

The only reason "Complaints" works is because that table has a broad SELECT policy.

## Verified Data

- Employee `9e02376e...` has 12 permissions including `seats_available_map`, `view_bookings`, etc.
- Partner `edb417fa...` owns cabin "Toppers reading room" (`is_active: false`, `is_approved: true`)
- Employee cannot SELECT this cabin due to RLS — no policy grants access via `partner_user_id`

## Solution

### 1. Create a reusable helper function (database migration)

```sql
CREATE OR REPLACE FUNCTION public.is_partner_or_employee_of(owner_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM public.vendor_employees
      WHERE employee_user_id = auth.uid()
        AND partner_user_id = owner_id
        AND status = 'active'
    )
$$;
```

### 2. Add vendor employee SELECT policies on critical tables

Using the helper function, add new policies on the tables the employee needs:

| Table | Policy | Condition |
|-------|--------|-----------|
| `cabins` | Vendor employees can view employer cabins | `is_partner_or_employee_of(created_by)` |
| `seats` | Vendor employees can view employer seats | Join to cabins, check `is_partner_or_employee_of(c.created_by)` |
| `bookings` | Vendor employees can view/manage employer bookings | Join to cabins, check `is_partner_or_employee_of(c.created_by)` |
| `dues` | Fix broken employee policy | Replace `c.created_by = auth.uid()` with `is_partner_or_employee_of(c.created_by)` |
| `due_payments` | Vendor employees can manage employer due payments | Join to dues → cabins, check helper |
| `complaints` | Vendor employees can view/update employer complaints | Join to cabins/hostels, check helper |

### 3. Fix `usePartnerPropertyTypes` dependency

Also update `useEffect` dependency to include `user.vendorId` so it re-fetches when vendorId becomes available:

```typescript
}, [user?.id, user?.vendorId, isPartner]);
```

### 4. Fix sidebar `propertyTypes.loading` check

Add `propertyTypes.loading` to the sidebar's loading check so it doesn't render with stale false values.

## Files to Change

| File | Change |
|------|--------|
| **Database migration** | Create `is_partner_or_employee_of()` function + add/fix RLS policies on 6 tables |
| `src/hooks/usePartnerPropertyTypes.ts` | Add `user?.vendorId` to useEffect deps |
| `src/components/admin/AdminSidebar.tsx` | Include `propertyTypes.loading` in loading check |

