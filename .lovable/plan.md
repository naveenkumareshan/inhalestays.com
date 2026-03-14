

# Improve Mess Booking Sheet — Tighter Spacing, Colors, Review Summary, VendorSeats Payment Pattern

## Problems
1. Too much vertical spacing between sections — needs tighter `space-y-3` and smaller margins
2. Too plain/monochrome — needs colored accents (emerald for selected, amber for dues, primary for headers)
3. No **Review Summary** before payment — VendorSeats has a read-only bordered summary box before payment method
4. Payment section doesn't match VendorSeats pattern (grouped label + `PaymentMethodSelector` with `columns={3}`, txn ID, proof, then "Collected by" as static text, then Confirm button with amount)
5. "Collected By" should be static display text like VendorSeats (`Collected by: {user?.name}`) not an editable input

## Changes to `src/pages/admin/MessBookings.tsx`

### Tighten spacing
- Main container: `space-y-4` → `space-y-3`
- Padding: `p-4` → `p-3`
- Reduce `mt-1.5` → `mt-1` on pills, inputs

### Add color accents
- Section labels: add color like `text-primary` or `text-slate-600` instead of `text-muted-foreground`
- Pricing box: `bg-primary/5 border-primary/20` instead of `bg-muted/20`
- Selected student badge: already emerald (keep)
- Due amount: already red (keep)
- Duration pills: add colored active state with gradient/shadow
- Package pills: selected = `bg-emerald-600 text-white` for variety

### Add Review Summary (before payment)
After pricing section, add a read-only bordered summary box matching VendorSeats exactly:
```
┌─ Booking Summary ─────────────────────┐
│ Student      │ Name                    │
│ Phone        │ -                       │
│ ─────────────────────────────────────  │
│ Mess         │ TestPartner Mess        │
│ Package      │ Breakfast               │
│ Period       │ 14 Mar → 13 Apr 2026    │
│ ─────────────────────────────────────  │
│ Package Price│ ₹800                    │
│ Discount     │ -₹0                     │
│ ─────────────────────────────────────  │
│ Total        │ ₹800       (bold)       │
│ Collecting   │ ₹500       (amber)      │
│ Due Balance  │ ₹300       (red)        │
└───────────────────────────────────────┘
```

### Payment Method — match VendorSeats pattern
- `PaymentMethodSelector` with `columns={3}` (not default 2)
- Transaction ID input only for non-cash (check `paymentMethod !== 'cash'` not `!paymentMethod.includes('cash')` since custom payment methods use `custom_uuid`)
- Use `requiresTransactionId` from PaymentMethodSelector for the check
- PaymentProofUpload for non-cash
- "Collected by" as static text: `Collected by: {user?.name || 'Partner'}` — remove the editable Input

### Confirm button
- Show amount on button: `Confirm · ₹{advanceAmount}`
- Disable if no payment method or (non-cash and no txn ID)

## Files Modified
- `src/pages/admin/MessBookings.tsx` — single file

