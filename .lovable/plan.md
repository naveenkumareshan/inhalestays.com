

# Fix: Linked Hostels Not Showing on Mess Cards

## Root Cause
The `fetchMesses` function sets both `messes` and `hostelLinksMap` in the same async call. Due to React 18 StrictMode double-mounting and async state update timing, the `hostelLinksMap` state can be lost or set on a stale component instance. The data IS returned from the API (confirmed via network logs), but the React state isn't reliably persisting to render time.

## Fix

### 1. `src/pages/admin/MessManagement.tsx`
- Split the hostel links fetch into a **separate `useEffect`** that triggers whenever `messes` changes
- This guarantees links are fetched AFTER messes are set in state, and the map is always in sync
- Add `console.log` temporarily for debugging if needed (will remove)

```typescript
// Remove links fetch from fetchMesses()
// Add separate effect:
useEffect(() => {
  if (messes.length === 0) return;
  const fetchLinks = async () => {
    const messIds = messes.map((m: any) => m.id);
    const { data: links } = await supabase
      .from('hostel_mess_links')
      .select('mess_id, hostel_id, is_default, hostels:hostel_id(name)')
      .in('mess_id', messIds);
    // build map and setHostelLinksMap
  };
  fetchLinks();
}, [messes]);
```

### 2. `src/pages/hotelManager/HostelManagement.tsx`
- Apply the same pattern: split mess links fetch into a separate `useEffect` dependent on `hostels` state
- Ensures the `messLinksMap` is always populated after hostels render

### 3. Verification of subscriptions & attendance
- Confirmed `MessBookings.tsx` properly displays `source_type` badges (Hostel Package, Addon, Manual) with hostel names
- Confirmed `MessAttendance.tsx` properly breaks down subscribers by source type
- No changes needed for these — they work correctly

## Files to Change

| File | Change |
|------|--------|
| `src/pages/admin/MessManagement.tsx` | Move links fetch to separate `useEffect` on `messes` |
| `src/pages/hotelManager/HostelManagement.tsx` | Move links fetch to separate `useEffect` on `hostels` |
