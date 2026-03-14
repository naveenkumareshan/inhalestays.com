

# Move QR Codes to Own Tab + Add View Before Download

## Changes

### 1. `src/pages/admin/OperationsHub.tsx`
Add a third tab "QR Codes" next to Check-in and Complaints with a `QrCode` icon.

### 2. Create `src/components/admin/operations/QrCodesTab.tsx` (NEW)
- Move the QR property fetching logic and `handleDownloadQr` from `CheckInTracker.tsx` into this new component
- Display properties as cards/list items. Each card shows:
  - Property name + type badge (RR/H/M)
  - **"View QR"** button that opens a dialog showing the QR code image
  - Inside the dialog: QR code preview image + **"Download"** button
- Use a `Dialog` for the view/preview with the rendered QR image and download action

### 3. `src/components/admin/operations/CheckInTracker.tsx`
- Remove the entire QR section (lines ~210-259): the `qrProperties` query, `handleDownloadQr`, the QR buttons bar, and the `QRCode` import
- Clean up unused imports (`QrCode`, `Download`, `QRCode` library import, `getEffectiveOwnerId`)

## Files
- `src/pages/admin/OperationsHub.tsx` — add QR Codes tab
- `src/components/admin/operations/QrCodesTab.tsx` — **NEW**
- `src/components/admin/operations/CheckInTracker.tsx` — remove QR section

