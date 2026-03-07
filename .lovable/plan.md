

# Upgrade Admin Settings UI + Dynamic Splash Screen

## Two tasks

### Task 1: Site Settings — Add logo upload + tagline field
Currently the logo field is just a URL text input. Replace it with an actual image upload button (reuse `ImageUpload` component or add a simple file-to-storage upload). Add a dedicated "Tagline" field separate from description (stored as `site_tagline` in `site_settings`).

### Task 2: Modernize Payment, Email, SMS, Platform tabs
These tabs use the old large Card/CardHeader style with `text-lg` fonts and full-size buttons. Convert them all to the compact high-density SaaS-style that Site Settings already uses (text-xs labels, h-8 inputs, compact cards, text-[11px] descriptions, small save buttons).

### Task 3: Splash screen reads dynamic settings
Currently `SplashOverlay` has hardcoded logo (`/splash-logo.png`), name (`InhaleStays`), and tagline (`Reading Room Booking`). Update it to fetch from `site_settings` table on mount and display the dynamic logo, site name, and tagline.

---

## Detailed changes

### `src/components/admin/SiteSettingsForm.tsx`
- Add `site_tagline` to `SETTINGS_KEYS` array and state
- Replace the Logo URL text input with a file upload area:
  - Use Supabase storage (`cabin-images` bucket or a new `site-assets` bucket) to upload the logo file
  - Show current logo preview with a change/remove button
  - On upload, save the public URL to `site_logo` setting
- Add a "Tagline" input field (short text, e.g. "Reading Room Booking") stored as `{ value: tagline }` under key `site_tagline`
- Keep the existing compact UI style

### `src/components/admin/settings/PaymentGatewaySettings.tsx`
- Replace the outer `Card > CardHeader > CardTitle/CardDescription` with compact card style (text-sm title, text-[11px] description, pb-3 header)
- Reduce all `text-lg` to `text-xs font-medium`, all Labels to `text-xs`
- Inputs to `h-8 text-xs`, Switches to `scale-90`
- Save button to `size="sm" h-8 text-xs gap-1.5` with Save icon
- Provider section headers become compact divider rows

### `src/components/admin/settings/EmailSettings.tsx`
- Same compact treatment: small card headers, text-xs labels, h-8 inputs, compact grid
- Test email section made compact
- Save button matches site settings style

### `src/components/admin/settings/SmsSettings.tsx`
- Same compact treatment for all provider sections and templates
- Templates textarea to `text-xs min-h-[60px] resize-none`
- Save button compact

### `src/components/SplashOverlay.tsx`
- On mount, query `site_settings` for keys `site_name`, `site_logo`, `site_tagline`
- Use fetched values (with fallbacks to current hardcoded defaults)
- Show the dynamic logo URL, site name, and tagline on the splash screen

| File | Change |
|------|--------|
| `src/components/admin/SiteSettingsForm.tsx` | Add logo file upload + tagline field |
| `src/components/admin/settings/PaymentGatewaySettings.tsx` | Compact SaaS-style UI |
| `src/components/admin/settings/EmailSettings.tsx` | Compact SaaS-style UI |
| `src/components/admin/settings/SmsSettings.tsx` | Compact SaaS-style UI |
| `src/components/SplashOverlay.tsx` | Fetch dynamic logo, name, tagline from DB |

