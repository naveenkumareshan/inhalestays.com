

# Fix: WhatsApp Settings Not Showing Saved State in Property Cards

## Problem
When a partner opens the WhatsApp settings dialog on a reading room property card, it always shows the toggle as OFF and the number as empty — even if they previously saved settings. This happens because:

1. **Data not mapped**: `RoomManagement.tsx` fetches cabin data but never maps `whatsapp_number` and `whatsapp_chat_enabled` fields to the cabin objects passed to `CabinItem`.
2. **Dialog doesn't sync**: `WhatsAppPropertyDialog` initializes state with `useState(initialNumber)` on mount only — it never resets when the dialog re-opens with new props.

Same issue likely exists in `HostelManagement.tsx`.

## Changes

### 1. `src/pages/RoomManagement.tsx`
In the `fetchCabins` mapping (line ~120-130), add:
```
whatsappChatEnabled: cabin.whatsapp_chat_enabled || false,
whatsappNumber: cabin.whatsapp_number || '',
```

### 2. `src/pages/hotelManager/HostelManagement.tsx`
Same fix — map `whatsapp_number` and `whatsapp_chat_enabled` in the hostel data processing.

### 3. `src/components/admin/WhatsAppPropertyDialog.tsx`
Add a `useEffect` to sync local state when `initialNumber`/`initialEnabled` props change (e.g., when dialog opens with fresh data):
```tsx
useEffect(() => {
  setNumber(initialNumber);
  setEnabled(initialEnabled);
}, [initialNumber, initialEnabled]);
```

### 4. `src/components/admin/WhatsAppPropertyDialog.tsx` — fetch on open
Better approach: fetch the current values from DB when dialog opens, so it's always accurate regardless of parent mapping. Add a small `useEffect` that queries the property's current `whatsapp_number` and `whatsapp_chat_enabled` when `open` becomes `true`.

## Files Modified
- `src/pages/RoomManagement.tsx` — add whatsapp field mapping
- `src/pages/hotelManager/HostelManagement.tsx` — add whatsapp field mapping  
- `src/components/admin/WhatsAppPropertyDialog.tsx` — fetch from DB on open for reliable state

