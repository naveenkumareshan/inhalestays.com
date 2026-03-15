

## Fix Complaints: Missing Messages, Broken Joins, and Property Names

### Root Causes Found

1. **400 error on complaints query** — The `complaints` table has no foreign key from `user_id` to `profiles.id`. PostgREST requires FK relationships for embedded joins like `profiles:user_id(name, email)`. This breaks the Operations Hub ComplaintTracker, ComplaintsManagement page, and SupportTicketsManagement (same issue on `support_tickets`).

2. **Vendor/Employee RLS on `complaints` missing `mess_id`** — The SELECT and UPDATE policies for vendors and employees only check `cabin_id` and `hostel_id`, ignoring `mess_id` complaints entirely. Partners who own a mess cannot see complaints filed against them.

3. **Student complaint list doesn't show property name** — When a student has multiple complaints, the list only shows subject/category/status but not which property it's about, causing confusion.

---

### Changes

#### 1. Database Migration
- Add foreign key `complaints.user_id → profiles.id`
- Add foreign key `support_tickets.user_id → profiles.id`
- Drop and recreate vendor/employee SELECT and UPDATE policies on `complaints` to include `mess_id` via `is_partner_or_employee_of()`

#### 2. Student ComplaintsPage (`src/components/profile/ComplaintsPage.tsx`)
- Update complaints query to join property names: `cabins:cabin_id(name)`, `hostels:hostel_id(name)`, `mess_partners:mess_id(name)`
- Show property name in the complaint list cards (below subject)
- Show property name in the complaint detail header (below subject line)

#### 3. Operations ComplaintTracker (`src/components/admin/operations/ComplaintTracker.tsx`)
- Already uses `profiles:user_id(name, phone, email)` — will work once FK is added (no code change needed)

#### 4. ComplaintsManagement (`src/components/admin/ComplaintsManagement.tsx`)
- Already uses `profiles:user_id(name, email, phone)` — will work once FK is added (no code change needed)

