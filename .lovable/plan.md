

# Fix: Show Linked Mess Names on Hostel Cards

## Problem
The linked mess names were only added to the **Mess management cards** (MessItem), but not to the **Hostel management cards** (HostelItem). Since the user is on `/admin/hostels`, they can't see any linked mess names on their hostel cards.

## Changes

### 1. `src/components/admin/HostelItem.tsx`
- Add a `linkedMesses` prop: `{ mess_id: string; mess_name: string; is_default: boolean }[]`
- Render linked mess names as badges (e.g., "🍽️ Mess Name ★") in the meta row, after the "Student Visible/Hidden" badge

### 2. `src/pages/hotelManager/HostelManagement.tsx`
- After fetching hostels, batch-fetch `hostel_mess_links` for all hostel IDs with joined mess partner names
- Build a map of `hostelId → [{ mess_id, mess_name, is_default }]`
- Pass `linkedMesses={messLinksMap[hostel.id]}` to each `HostelItem`

## Files

| File | Change |
|------|--------|
| `src/components/admin/HostelItem.tsx` | Add `linkedMesses` prop, render mess name badges |
| `src/pages/hotelManager/HostelManagement.tsx` | Fetch mess links, pass to HostelItem |

