

# Remove Payment Modes Section from Partner Profile

## Problem
The Payment Modes manager appears on both the Profile page and the Bank Management page. Since bank/payment management is now centralized under `/banks`, the duplicate section on the Profile page should be removed.

## Changes

### `src/pages/vendor/VendorProfile.tsx`
- Remove the `PaymentModesManager` import
- Remove the `<PaymentModesManager />` component from the page layout
- Keep `VendorProfile` and `WhatsAppSettings` components intact

