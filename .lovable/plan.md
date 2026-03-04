

# Fix: Partner Login — Pages Not Showing

## Root Cause

The `fetchUserRole` function in `AuthContext.tsx` (line 59-63) uses `.single()` to query the `user_roles` table. The problem: the `handle_new_user` trigger automatically inserts a `'student'` role for every new user. When an admin later assigns the `'vendor'` role to a partner, that user ends up with **two rows** in `user_roles` — both `'student'` and `'vendor'`.

`.single()` fails when multiple rows are returned (PostgreSQL error PGRST116), causing `fetchUserRole` to default to `'student'`. The `ProtectedRoute` then sees a "student" user trying to access an admin-required route and redirects them to `/student/dashboard` — which is why partner pages never show.

## Fix

### File: `src/contexts/AuthContext.tsx`

Replace the `.single()` query with one that handles multiple roles by prioritizing the highest-privilege role:

```typescript
const fetchUserRole = async (userId: string): Promise<UserRole> => {
  const cached = roleCache.get(userId);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  if (error || !data || data.length === 0) {
    console.warn('No role found for user, defaulting to student');
    return 'student';
  }

  // Priority order: pick the highest-privilege role
  const priority: UserRole[] = ['super_admin', 'admin', 'vendor', 'vendor_employee', 'hostel_manager', 'student'];
  const roles = data.map(r => r.role as UserRole);
  const role = priority.find(p => roles.includes(p)) || 'student';

  roleCache.set(userId, role);
  return role;
};
```

**What changes:**
- Remove `.single()` — fetch all role rows for the user
- When multiple roles exist, pick the highest-priority one (super_admin > admin > vendor > vendor_employee > hostel_manager > student)
- Partners with both 'student' and 'vendor' roles will correctly resolve to 'vendor'

### Files Changed
- `src/contexts/AuthContext.tsx` — one function fix (~15 lines)

