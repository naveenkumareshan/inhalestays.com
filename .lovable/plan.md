

# Fix: Hostel Floors Not Showing in Bed Map

## Problem
The `HostelBedMap.tsx` page uses the legacy integer `floor` column from `hostel_rooms` (which is always `1`), ignoring the `hostel_floors` table entirely. Since all rooms have `floor = 1`, the floor filter shows only "Floor 1" even when multiple named floors exist (e.g., "2nd Floor", "3rd Floor").

## Root Cause
- The beds query selects `hostel_rooms!inner(room_number, category, floor, hostel_id, ...)` — uses integer `floor`, not `floor_id`
- Floor filter derives from `beds.map(b => b.floor)` which is always `1`
- Floor labels are generic "Floor 1" instead of actual floor names

## Solution
Fetch `hostel_floors` data separately for the selected hostel, then use each room's `floor_id` to map beds to named floors.

### Changes to `src/pages/admin/HostelBedMap.tsx`

1. **Add `floor_id` to the beds query select**: Change the hostel_rooms select to include `floor_id`
2. **Store `floorId` and `floorName` on each `HostelBed`**: Add `floorId: string` and `floorName: string` to the interface, populated from `room.floor_id`
3. **Fetch `hostel_floors` when a hostel is selected**: Query `hostel_floors` table for the selected hostel(s) to get floor names
4. **Update `availableFloors`**: Use `floorId` + floor name from the fetched floors data instead of the integer `floor`
5. **Update floor filtering**: Filter by `floorId` instead of integer `floor`
6. **Update display labels**: Show actual floor names (e.g., "2nd Floor") instead of "Floor 1"

### Detailed edits

**Interface** (line ~41-61): Add `floorId` and `floorName` fields to `HostelBed`

**Beds query** (line ~230): Add `floor_id` to the select:
```
hostel_rooms!inner(room_number, category, floor, floor_id, hostel_id, hostels!inner(id, name))
```

**Fetch floors** (new state + effect): Add `hostelFloors` state. When hostels load or `selectedHostelId` changes, fetch from `hostel_floors` table for relevant hostel IDs.

**Bed mapping** (line ~340-361): Map `floorId` from `room.floor_id` and resolve `floorName` from fetched floors.

**`availableFloors` memo** (line ~383-387): Derive from `floorId`/`floorName` pairs on beds instead of integer `floor`.

**`filteredBeds` and `availableRooms`** (lines ~389-432): Filter by `floorId` instead of `String(b.floor)`.

**Floor display** (line ~1339): Show `floorName` instead of `Floor {floor}`.

### Files
- **Edit**: `src/pages/admin/HostelBedMap.tsx` — all changes above

