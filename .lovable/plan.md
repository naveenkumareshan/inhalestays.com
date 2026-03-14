

# Fix: QR Download & Attendance System for Partners

## Issues Found

1. **QR buttons not showing for employees**: `ManageProperties.tsx` line 90-92 uses `user.id` directly in `.eq('created_by', user.id)`. Employees won't see properties since properties are created by the partner. Must use `getEffectiveOwnerId()`.

2. **QR system logic is working** — the RPC `mark_qr_attendance` is deployed and validates correctly. The scanner page and attendance service are properly wired. The only client-side gap is the property fetch for QR buttons.

## Changes

### File: `src/pages/partner/ManageProperties.tsx`
- Replace the `useEffect` that fetches `qrProperties` (lines 86-96) to use `getEffectiveOwnerId()` instead of `user.id` for the `created_by` filter. This ensures both partners and their employees see QR buttons for all properties.
- Import `getEffectiveOwnerId` from `@/utils/getEffectiveOwnerId`.

**Before:**
```ts
const { data: cabins } = await supabase.from('cabins').select('id, name').eq('created_by', user.id)...
```

**After:**
```ts
const { ownerId } = await getEffectiveOwnerId();
const { data: cabins } = await supabase.from('cabins').select('id, name').eq('created_by', ownerId)...
```

This is a single targeted fix — the RPC, scanner, attendance page, and RLS policies are all correctly implemented already.

