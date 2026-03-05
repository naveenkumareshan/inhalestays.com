

# Fix Student Search & Linking with Proper Data Isolation

## Current Problems

1. **`vendorSeatsService.searchStudents()`** queries `profiles` table with no partner filter — returns ALL users in the system to any partner/employee.
2. **`HostelBedMap.tsx` student search** (line 555) does the same — raw `profiles` query with no isolation.
3. **`adminUsersService.getUsers()`** filters students by bookings at partner properties (good), but the booking-flow search has no such restriction.
4. **No `student_property_links` table exists** — there's no mechanism to link a student to a partner outside of having a booking.
5. **HostelBedMap `handleCreateStudent`** doesn't call the `create-student` edge function — it just checks if email exists and fails if not.

## Plan

### 1. Database: Create `student_property_links` table

```sql
CREATE TABLE public.student_property_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  partner_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_user_id, partner_user_id)
);

ALTER TABLE public.student_property_links ENABLE ROW LEVEL SECURITY;

-- Partners/employees can read their own links
CREATE POLICY "Partners read own links" ON public.student_property_links
  FOR SELECT USING (is_partner_or_employee_of(partner_user_id));

CREATE POLICY "Partners insert own links" ON public.student_property_links
  FOR INSERT WITH CHECK (is_partner_or_employee_of(partner_user_id));

-- Admins full access
CREATE POLICY "Admins manage all links" ON public.student_property_links
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
```

### 2. Auto-link students on booking creation

In both `vendorSeatsService.createPartnerBooking` and `HostelBedMap.handleCreateBooking`, after successful booking insert, upsert a row into `student_property_links` with the student's ID and the partner's effective owner ID. This ensures every booked student is automatically linked.

### 3. Fix student search: two-tier approach

**`vendorSeatsService.searchStudents(query, partnerId)`** — new signature:

- **Step 1**: Query `student_property_links` joined with `profiles` filtered by `partner_user_id = partnerId` and search term. Return results tagged `linked: true`.
- **Step 2**: If results < 5, also query `profiles` globally by phone/email (exact or partial match), excluding already-found IDs. Return these tagged `linked: false` with a label like "Not linked — link to your property?"
- Return combined results with the `linked` flag.

For admins, skip the partner filter — return all profiles (current behavior).

### 4. Update search UI in both booking flows

**`VendorSeats.tsx`** and **`HostelBedMap.tsx`**:

- Pass `user?.vendorId || user?.id` as `partnerId` to the search function.
- In the dropdown results, show a visual indicator for unlinked students (e.g., a subtle badge "Global match").
- When selecting an unlinked student, auto-upsert into `student_property_links` (link on selection).
- Admins see all results without the linked/unlinked distinction.

### 5. Fix HostelBedMap `handleCreateStudent`

Replace the current "must register first" logic with a call to `supabase.functions.invoke('create-student')` (same as VendorSeats), then auto-link to the partner via `student_property_links`.

### 6. Update `adminUsersService.getUsers()` for partners

Replace the current booking-based student filtering with a simpler query: fetch student IDs from `student_property_links` where `partner_user_id = ownerId`. This is faster, consistent, and covers students who were created but haven't booked yet.

### Files to Change

| File | Change |
|------|--------|
| **DB Migration** | Create `student_property_links` table with RLS |
| `src/api/vendorSeatsService.ts` | Update `searchStudents` to accept `partnerId`, implement two-tier search; auto-link on `createPartnerBooking` |
| `src/pages/vendor/VendorSeats.tsx` | Pass partnerId to search; show linked/unlinked badge; auto-link on select |
| `src/pages/admin/HostelBedMap.tsx` | Same search updates; fix `handleCreateStudent` to use edge function + auto-link |
| `src/api/adminUsersService.ts` | Replace booking-based student filter with `student_property_links` query |

