

# Fix: Invalid UUID on Hostel Creation + Area Selection Reset

## Problem 1: "Invalid input syntax" error
When creating a new hostel, the `HostelEditor` initializes `id: ''` (line 38). The `handleSave` passes `{ ...hostel }` to `onSave`, which calls `hostelService.createHostel`. The `sanitizeUUIDs` function only cleans `state_id`, `city_id`, `area_id`, `created_by`, `vendor_id` — it does NOT clean `id`. So Postgres receives `id: ''` which is not a valid UUID.

**Fix in `src/api/hostelService.ts`**: In `createHostel`, strip the `id` field if it's empty before inserting. Also strip any other non-DB fields that might leak through.

```typescript
createHostel: async (hostelData: Partial<HostelData>) => {
  const { data: { user } } = await supabase.auth.getUser();
  const { id, ...rest } = hostelData; // Remove id for new records
  const sanitized = sanitizeUUIDs({ ...rest, created_by: user?.id });
  // ...
```

## Problem 2: Area selection not resetting properly
When the state changes, `onCityChange('')` and `onAreaChange('')` are called. Radix Select with `value=""` doesn't display "Select area" placeholder — it shows stale text. The fix is to pass `undefined` instead of `''` when there's no selection.

**Fix in `src/components/forms/LocationSelector.tsx`**: Convert empty string values to `undefined` for the Select `value` prop:

```tsx
<Select value={selectedState || undefined} ...>
<Select value={selectedCity || undefined} ...>
<Select value={selectedArea || undefined} ...>
```

Also ensure `loadCities` is only called when `selectedState` is truthy (already done), and `localCities`/`localAreas` are cleared when parent values reset. Add cleanup when state/city become empty.

## Files to Change

| File | Change |
|------|--------|
| `src/api/hostelService.ts` | Strip `id` from data in `createHostel` before insert |
| `src/components/forms/LocationSelector.tsx` | Use `undefined` instead of `''` for Select value props; clear lists on reset |

