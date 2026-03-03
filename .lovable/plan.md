

# 1. Copiable Employee Login Links + 2. Partner Onboarding Landing Page

## Part 1: Copiable Login Links in Employee Pages

### Admin Employees Page (`src/pages/admin/AdminEmployees.tsx`)
- Replace the static text showing `/admin/login` with a copiable full URL using `getPublicAppUrl() + '/admin/login'`
- Add a Copy button (clipboard icon) next to the URL that copies to clipboard and shows a toast confirmation

### Partner Employees Page (`src/pages/vendor/VendorEmployees.tsx`)
- Add the same copiable login URL box showing `getPublicAppUrl() + '/partner/login'`
- Same copy-to-clipboard behavior with toast feedback

Both will use a small info card at the top with the full URL and a copy icon button.

---

## Part 2: Partner Onboarding Landing Page

Create a new page at `/partner/onboard` that serves as a marketing/information page to attract partners before they register. This replaces the direct jump to the complex multi-step registration form.

### Page Structure

**Hero Section:**
- Headline: "Partner with InhaleStays" with subtext about growing their business
- Three selectable property type cards: Reading Room, Hostel, Laundry -- partner can select one or multiple to see relevant features

**Features Section (dynamic based on selection):**
- Reading Room features: Seat map management, automated booking, due management, slot-based pricing, deposit management, analytics dashboard, student management
- Hostel features: Bed/room/floor management, sharing types, food management, stay packages, booking calendar, multi-property support
- Laundry features: Order management, pickup/delivery tracking, agent dashboard, complaint handling
- Common features (always shown): Partner dashboard, employee management, settlement tracking, payout management, subscription plans, reviews management

**How It Works Section:**
- Step 1: Register with basic details (phone + email)
- Step 2: Our team contacts you for verification
- Step 3: Set up your property on the platform
- Step 4: Start receiving bookings

**FAQ Section:**
- Accordion with common questions: commission rates, how payments work, how long approval takes, what documents needed, can I manage multiple properties, etc.

**CTA / Registration Section:**
- Simple registration form capturing only: Name, Phone, Email, Password, Interested Property Types (from selection above)
- "Register Now" button
- This creates the user account via the existing `admin-create-user` edge function with role `vendor`, and inserts a minimal partner record
- The partner can fill in business details, bank details, documents later from their dashboard
- The admin gets a lead (name + phone + email) for follow-up even if partner doesn't complete full setup

### Simplified Registration Flow
The current `VendorRegister` page requires 4 steps with all business/bank/address details upfront. The new approach:
1. New `/partner/onboard` page collects only essentials (name, phone, email, password, property types)
2. On submit: creates auth user + profile + partner record with `status: 'pending'`
3. Redirect to `/partner/login` with success message
4. Keep the old `/partner/register` route working (redirect to `/partner/onboard`)

### Database
- No new tables needed -- uses existing `profiles` and `partners` tables
- The partner record is created with minimal data; admin follows up to collect details

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/pages/partner/PartnerOnboard.tsx` | New landing + simplified registration page |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/admin/AdminEmployees.tsx` | Add copiable full URL with copy button |
| `src/pages/vendor/VendorEmployees.tsx` | Add copiable login URL with copy button |
| `src/App.tsx` | Add `/partner/onboard` route, redirect `/partner/register` to it |

## Technical Details

### Copiable URL Implementation
```typescript
const loginUrl = `${getPublicAppUrl()}/admin/login`;
const handleCopy = () => {
  navigator.clipboard.writeText(loginUrl);
  toast({ title: "Copied!", description: "Login URL copied to clipboard" });
};
```

### Simplified Registration
The onboard page will call the existing `admin-create-user` edge function (or directly use Supabase auth signup) to create a minimal user with vendor role, then insert a partner record with just the contact info and selected property types. This ensures the admin has a lead to follow up on.

