

# Branded QR Code Design — All Locations

## Concept
Instead of generating a plain black-and-white QR code image, we'll create a **branded QR card** rendered on an HTML5 Canvas that includes:

```text
┌──────────────────────────┐
│                          │
│   [InhaleStays Logo]     │
│   InhaleStays.com        │
│                          │
│   ┌──────────────────┐   │
│   │                  │   │
│   │    QR CODE       │   │
│   │                  │   │
│   └──────────────────┘   │
│                          │
│   Property Name Here     │
│   ─ Reading Room ─       │
│                          │
└──────────────────────────┘
```

- Top: InhaleStays logo image + "InhaleStays.com" text
- Center: QR code
- Bottom: Property name + type label (Reading Room / Hostel / Mess)
- Background: white card with subtle brand-colored border/header gradient
- Download produces this full branded card as a PNG

## Implementation

### 1. New shared utility: `src/utils/brandedQrGenerator.ts`
A single function `generateBrandedQrPng(propertyId, propertyType, propertyName): Promise<string>` that:
- Creates an offscreen canvas (~480x640px)
- Draws a white background with rounded corners
- Draws the brand gradient header bar
- Loads and draws the InhaleStays logo from `/splash-logo.png`
- Draws "InhaleStays.com" text below logo
- Generates the QR code via `QRCode.toCanvas()` or `toDataURL` and draws it centered
- Draws the property name and type label at the bottom
- Returns `canvas.toDataURL('image/png')`

### 2. Update `QrCodesTab.tsx` (Operations Hub)
- Replace `QRCode.toDataURL` call with `generateBrandedQrPng()`
- The dialog preview and download both use the branded image

### 3. Update `ManageProperties.tsx` (Partner page)
- Replace `QRCode.toDataURL` call in `handleOpenQr` with `generateBrandedQrPng()`
- The dialog already shows the image and downloads it — no structural change needed

### Files
- **NEW**: `src/utils/brandedQrGenerator.ts`
- **EDIT**: `src/components/admin/operations/QrCodesTab.tsx`
- **EDIT**: `src/pages/partner/ManageProperties.tsx`

