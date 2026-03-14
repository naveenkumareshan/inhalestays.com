

# Make Stats Bar Items Clickable Filters

## What Changes
The stats bar items (Total, Booked, Available, Expiring, Blocked, Present) become toggle buttons. Clicking one filters the seat/bed grid to show only that status. Clicking the active one again resets to "All".

## Implementation

### 1. `src/pages/vendor/VendorSeats.tsx` (Reading Room)

**Type update** (~line 49):
- Add `'present'` to `StatusFilter`: `type StatusFilter = 'all' | 'available' | 'booked' | 'expiring_soon' | 'blocked' | 'present';`

**Filter logic** (~line 296):
- Add `present` case: filter seats where `attendanceSet.has(s._id)`

**Stats bar** (~lines 830-846):
- Add a `filter` key to each stat item mapping to the StatusFilter value (Total→'all', Booked→'booked', Available→'available', Expiring→'expiring_soon', Blocked→'blocked', Present→'present')
- Make each item a `<button>` with `onClick={() => setStatusFilter(current === filter ? 'all' : filter)}`
- Add active highlight styling: when `statusFilter === filter`, apply `bg-primary/10` or ring

**Status dropdown** (~line 890):
- Add `<SelectItem value="present">Present</SelectItem>` to keep dropdown in sync

### 2. `src/pages/admin/HostelBedMap.tsx` (Hostel)

**Same pattern**:
- Add `'present'` to `StatusFilter` type (~line 42)
- Add present filter case in the filtering memo (~line 483)
- Make stats bar items clickable buttons with active state (~lines 1196-1213)
- Hostel also has `'future_booked'` — map the "Future" stat to that filter
- Add `present` to status dropdown

### Interaction Pattern
- Click a stat → filters to that status, stat gets highlighted ring/bg
- Click same stat again → resets to "all"
- Syncs with the existing status dropdown (both control `statusFilter`)

### Files
- **EDIT**: `src/pages/vendor/VendorSeats.tsx` — 4 small edits
- **EDIT**: `src/pages/admin/HostelBedMap.tsx` — 4 small edits

