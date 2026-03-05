

# Fix: Vendor Employee Cannot See Sidebar — Missing RLS Policy

## Problem
When a `vendor_employee` logs in, the `buildUser` function in `AuthContext.tsx` queries the `vendor_employees` table to fetch their permissions. However, the RLS policy on `vendor_employees` only allows access to:
- The **partner** who owns the employee (`partner_user_id = auth.uid()`)
- **Admins**

There is **no policy allowing the employee to read their own record**. The query silently returns no rows, so `permissions` stays as an empty array and every sidebar item is hidden.

## Fix
Add an RLS policy on `vendor_employees` that lets an employee SELECT their own row:

```sql
CREATE POLICY "Employees can view own record"
ON public.vendor_employees
FOR SELECT
USING (employee_user_id = auth.uid());
```

This is a single database migration. No code changes needed — the existing `AuthContext.tsx` logic from the previous fix will work once it can actually read the data.

## Files to Change

| Change | Detail |
|--------|--------|
| **Database migration** | Add SELECT RLS policy on `vendor_employees` for `employee_user_id = auth.uid()` |

No UI or code file modifications required.

