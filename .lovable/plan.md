

# Plan: Show Reading Room Name & Floor in Seat Detail Sheet

## Problem
The seat detail drawer (right-side sheet) only shows "Seat #1" with no reading room name or floor number. This can lead to employee mistakes when multiple rooms are managed.

## Solution
Add the reading room name and floor number to the sheet header in `src/pages/vendor/VendorSeats.tsx`.

### Change (single file)
**`src/pages/vendor/VendorSeats.tsx`** — Line ~1098-1101

Current:
```tsx
<SheetTitle className="text-sm flex items-center gap-2">
  Seat #{selectedSeat.number}
  <Badge variant="outline">{selectedSeat.category}</Badge>
  <span className="ml-auto">₹{selectedSeat.price}/mo</span>
</SheetTitle>
```

Updated to:
```tsx
<SheetTitle className="text-sm flex flex-col gap-1">
  <div className="flex items-center gap-2">
    Seat #{selectedSeat.number}
    <Badge variant="outline">{selectedSeat.category}</Badge>
    <span className="ml-auto">₹{selectedSeat.price}/mo</span>
  </div>
  <div className="text-xs font-normal text-muted-foreground">
    {selectedSeat.cabinName} · Floor {(selectedSeat as any).floor}
  </div>
</SheetTitle>
```

This adds a subtitle line showing e.g. "Alpha Reading Room · Floor 1" directly below the seat number, making it immediately clear which property and floor the seat belongs to.

