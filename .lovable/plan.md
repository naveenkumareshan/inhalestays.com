

# Plan: WhatsApp Chat Lead Generation for Partners

## Overview
Allow partners to set a WhatsApp number. When enabled globally by admin, students see a WhatsApp chat button on property detail pages (Reading Room, Hostel, Mess). Each click is tracked and counts are shown to both partner and admin.

## Database Changes

### 1. Add `whatsapp_number` to `partners` table
```sql
ALTER TABLE partners ADD COLUMN whatsapp_number text;
ALTER TABLE partners ADD COLUMN whatsapp_enabled boolean DEFAULT false;
```

### 2. Add global admin toggle via `site_settings` table
Create a lightweight `site_settings` table (key-value) to store the global admin toggle:
```sql
CREATE TABLE public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
-- Everyone can read settings, only admins can update
CREATE POLICY "Anyone can read" ON site_settings FOR SELECT USING (true);
CREATE POLICY "Admins can update" ON site_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
INSERT INTO site_settings (key, value) VALUES ('whatsapp_chat', '{"enabled": true}');
```

### 3. Create `whatsapp_clicks` tracking table
```sql
CREATE TABLE public.whatsapp_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_user_id uuid NOT NULL REFERENCES profiles(id),
  property_type text NOT NULL,       -- 'cabin', 'hostel', 'mess'
  property_id uuid NOT NULL,
  user_id uuid REFERENCES profiles(id), -- nullable for anonymous
  created_at timestamptz DEFAULT now()
);
ALTER TABLE whatsapp_clicks ENABLE ROW LEVEL SECURITY;
-- Authenticated users can insert
CREATE POLICY "Auth can insert" ON whatsapp_clicks FOR INSERT TO authenticated WITH CHECK (true);
-- Partners see their own clicks, admins see all
CREATE POLICY "Partners see own" ON whatsapp_clicks FOR SELECT TO authenticated
  USING (partner_user_id = auth.uid() OR is_partner_or_employee_of(partner_user_id)
         OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
```

## Frontend Changes

### 4. New service: `src/api/whatsappLeadService.ts`
- `getSiteWhatsappEnabled()` — read from `site_settings` where key = `whatsapp_chat`
- `getPartnerWhatsappNumber(partnerUserId)` — read from `partners`
- `trackWhatsappClick(partnerUserId, propertyType, propertyId)` — insert into `whatsapp_clicks`
- `getWhatsappClickCount(partnerUserId)` — count for partner dashboard
- `getAllWhatsappClicks(filters)` — for admin

### 5. Student-facing pages — Add WhatsApp button
**`src/pages/BookSeat.tsx`**: After loading cabin, fetch the partner's WhatsApp number via `created_by`. If site setting enabled + partner has number, show a floating WhatsApp button with pre-drafted message like:
> "Hi, I'm interested in a seat at {cabin.name}. Can you share more details?"

On click: track the click, then open `https://wa.me/{number}?text={encoded_message}`.

**`src/pages/HostelRoomDetails.tsx`**: Same pattern using `hostel.created_by`.

**`src/pages/MessDetail.tsx`**: Same pattern using `mess.user_id`.

### 6. Shared component: `src/components/WhatsAppChatButton.tsx`
A reusable floating button component that:
- Takes `partnerUserId`, `propertyType`, `propertyId`, `propertyName`
- Fetches partner WhatsApp number and global setting
- Shows green WhatsApp FAB if enabled
- On click: logs to `whatsapp_clicks`, opens `wa.me` link

### 7. Partner side — WhatsApp number input
**`src/components/vendor/VendorProfile.tsx`**: Add a WhatsApp number field in the profile edit form, reading/writing to `partners.whatsapp_number` and `partners.whatsapp_enabled` toggle.

### 8. Partner dashboard — Click count card
**`src/pages/vendor/VendorDashboard.tsx`**: Add a small stat card showing total WhatsApp lead clicks.

### 9. Admin side — Global toggle + click stats
**`src/components/admin/SiteSettingsForm.tsx`**: Add a "WhatsApp Chat for Partners" toggle that updates `site_settings`.

**Admin Dashboard or a section in settings**: Show aggregated click counts per partner.

## Summary

| File | Change |
|------|--------|
| Migration | Add `whatsapp_number`, `whatsapp_enabled` to partners; create `site_settings`; create `whatsapp_clicks` |
| `src/api/whatsappLeadService.ts` | New service for settings, tracking, counts |
| `src/components/WhatsAppChatButton.tsx` | New reusable floating WhatsApp button |
| `src/pages/BookSeat.tsx` | Add WhatsAppChatButton with cabin's `created_by` |
| `src/pages/HostelRoomDetails.tsx` | Add WhatsAppChatButton with hostel's `created_by` |
| `src/pages/MessDetail.tsx` | Add WhatsAppChatButton with mess's `user_id` |
| `src/components/vendor/VendorProfile.tsx` | Add WhatsApp number input + enable toggle |
| `src/pages/vendor/VendorDashboard.tsx` | Add WhatsApp leads stat card |
| `src/components/admin/SiteSettingsForm.tsx` | Add global WhatsApp chat toggle |

