

## Redesign Email Reports & Email Templates Pages

### Problem
Both pages (`EmailJobManagement` and `EmailTemplatesManagement`) use old axios-based API services (`jobProcessingService`, `emailTemplatesService`) that call a non-existent external backend, causing `Network Error`. These need to be completely rewritten to work with the actual backend infrastructure.

### What We'll Build

**1. Email Reports Page** — Complete rewrite using the `email_send_log` table

The `email_send_log` table has: `id`, `message_id`, `template_name`, `recipient_email`, `status`, `error_message`, `metadata`, `created_at`. Currently empty but the structure is ready.

New design:
- **Summary stat cards** at top: Total Emails, Sent, Failed/DLQ, Pending — with color-coded icons
- **Filters row**: Time range presets (24h, 7d, 30d), template type dropdown, status filter, search by recipient
- **Email log table**: Deduplicated by `message_id`, columns: S.No., Template, Recipient, Status (badge), Error, Timestamp. Pagination with rows-per-page selector
- All data fetched directly from Supabase `email_send_log` table — no external API
- Compact admin UI style matching existing pages (small text, tight spacing)

**2. Email Templates Page** — Show the actual auth email templates from the edge functions

Since templates now live as React Email TSX files in `supabase/functions/_shared/email-templates/`, the page will:
- List the 6 auth email templates (signup, magic-link, recovery, invite, email-change, reauthentication) as read-only cards
- Each card shows: template name, description, type badge
- **Preview button** that calls the `auth-email-hook/preview` endpoint to render the template HTML
- Remove the old CRUD operations (create/edit/delete) since templates are managed as code files
- Show email domain verification status at the top

**3. Sidebar update** — Rename "Messaging" group to "Emails" for clarity

### Files to Modify
- `src/components/admin/email_reports/EmailJobManagement.tsx` — Complete rewrite to use Supabase `email_send_log`
- `src/components/admin/EmailTemplatesManagement.tsx` — Complete rewrite to show auth templates with preview
- `src/components/admin/AdminSidebar.tsx` — Minor label update

### No Database Changes
Using existing `email_send_log` table as-is.

