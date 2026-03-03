

# Remove DIGIM Contact Info from Footer and Contact Page

## Changes

### `src/components/Footer.tsx`
- Remove the entire "Contact Us" section (lines 46-69) which contains DIGIM TECHNOLOGIES company name, GST number, address, and phone number
- Change grid from `md:grid-cols-4` to `md:grid-cols-2` since only Brand and Quick Links remain
- Remove `Building2`, `MapPin`, `Phone` from icon imports (no longer used)

### `src/pages/Contact.tsx`
- Remove the hardcoded contact info card (address "123 Hostel Avenue", email "info@inhalestays.com", phone "+1 (234) 567-890", office hours)
- Remove the "Our Location" card with the map placeholder
- Keep only the "Send us a message" form card, centered on the page
- Update page description to say contact details will be updated soon

