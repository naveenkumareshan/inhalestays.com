

## Analysis: Partner Laundry Sidebar Not Showing

### Investigation Results

I've thoroughly checked the database, RLS policies, and code. Here's what I found:

**Data**: The test partner ("Fresh & Clean Laundry") exists with `user_id = b7223bac-ef5c-48aa-ba49-d530d15f6f8e`, `is_active = true`, `status = 'active'`, `is_student_visible = true`.

**RLS Policies on `laundry_partners`**: 
- "Admins can manage all laundry partners" (ALL) — admin only
- "Partners can view own record" (SELECT) — `auth.uid() = user_id`
- "Partners can update own record" (UPDATE) — `auth.uid() = user_id`  
- "Partners can manage own partner record" (ALL) — `is_partner_or_employee_of(user_id)`
- "Students can view active laundry partners" (SELECT) — active + student_visible

**Sidebar Logic** (`AdminSidebar.tsx` line 322):
```
if (user?.role === 'admin' || (isPartner && propertyTypes.hasLaundry))
```

**`usePartnerPropertyTypes` hook**: Queries `laundry_partners` where `user_id = vendorUserId`. For the test vendor, this should return the record.

### Root Cause

Everything is correctly configured. The sidebar **will** show the Laundry section when the test partner (`testpartner123@test.com`) logs in at `/partner/login`. The laundry section already appears for admin users (as you can see on `/admin/laundry`).

**To verify**: Log in as the test partner at `/partner/login` with the credentials for `testpartner123@test.com`. The Laundry sidebar group should appear with "Manage Laundry", "Laundry Orders", and "Laundry Operations" sub-items.

### Safety Enhancement (Recommended)

Add a `LaundryReceipts` sub-item to match the pattern used by Reading Rooms and Hostels, and also add the `laundry-receipts` route under `/partner/`:

| File | Action |
|------|--------|
| `src/components/admin/AdminSidebar.tsx` | Add "Laundry Receipts" sub-item under Laundry section |
| `src/App.tsx` | Add `laundry-receipts` route under both admin and partner route groups |
| `src/pages/admin/AdminLaundry.tsx` | No change — already handles partner listing |

If the partner truly cannot see the sidebar after logging in, the issue would be an authentication/session problem rather than a code bug. Please confirm by logging in as the test partner.

