
# Per-Property Subscription Model

## Overview
Build a complete subscription system where each partner property (Hostel or Reading Room) requires an active subscription plan. Admin defines plans with configurable limits, features, and pricing. Partners subscribe per property via Razorpay (yearly billing). The system enforces capacity limits and feature restrictions based on the active plan. No downgrades, no refunds.

---

## Phase 1: Database Schema

### Table: `subscription_plans` (Admin-managed plan definitions)
- `id` (uuid, PK)
- `name` (text) -- Silver, Gold, Platinum, Diamond
- `slug` (text, unique) -- silver, gold, platinum, diamond
- `price_yearly` (numeric) -- annual price in INR
- `price_monthly_display` (numeric) -- for display only (e.g. 800)
- `hostel_bed_limit` (integer) -- max beds (0 = unlimited)
- `reading_room_seat_limit` (integer) -- max seats (0 = unlimited)
- `features` (jsonb) -- array of feature keys enabled for this plan
- `capacity_upgrade_enabled` (boolean, default false)
- `capacity_upgrade_price` (numeric, default 300) -- per slab
- `capacity_upgrade_slab_beds` (integer, default 50)
- `capacity_upgrade_slab_seats` (integer, default 75)
- `display_order` (integer)
- `is_active` (boolean, default true)
- `description` (text)
- `serial_number` (text, auto with prefix `SPLAN`)
- `created_at`, `updated_at` (timestamptz)

Default features list stored in `features` jsonb:
```json
["booking_management", "student_list", "basic_dues", "standard_support",
 "basic_analytics", "downloadable_reports", "sponsored_eligible",
 "advanced_analytics", "monthly_comparison", "dues_aging_report",
 "refund_tracking", "sponsored_priority", "priority_support",
 "api_access", "white_label", "top_sponsored", "dedicated_support",
 "early_access", "custom_reports", "settlement_tracking"]
```

### Table: `property_subscriptions` (Per-property active subscriptions)
- `id` (uuid, PK)
- `partner_id` (uuid, FK to partners)
- `property_type` (text: 'hostel' | 'reading_room')
- `property_id` (uuid) -- references hostel or cabin
- `plan_id` (uuid, FK to subscription_plans)
- `status` (text: 'active' | 'expired' | 'pending_payment')
- `start_date` (date)
- `end_date` (date)
- `amount_paid` (numeric)
- `capacity_upgrades` (integer, default 0) -- number of extra slabs purchased
- `capacity_upgrade_amount` (numeric, default 0)
- `razorpay_order_id` (text)
- `razorpay_payment_id` (text)
- `payment_status` (text: 'pending' | 'completed' | 'failed')
- `serial_number` (text, auto with prefix `SSUB`)
- `previous_plan_id` (uuid, nullable) -- track upgrades
- `created_at`, `updated_at` (timestamptz)

### RLS Policies
- Admins: full CRUD on both tables
- Partners: SELECT on `subscription_plans` (active only); SELECT + INSERT on `property_subscriptions` where `partner_id` matches
- Public: SELECT on `subscription_plans` (active only, for display)

### Serial Number Triggers
- `set_serial_subscription_plans` with prefix `SPLAN`
- `set_serial_property_subscriptions` with prefix `SSUB`

---

## Phase 2: Edge Function -- `subscription-create-order`

New edge function to handle subscription Razorpay payments:
- Accepts: `planId`, `propertyId`, `propertyType`, `capacityUpgrades` (optional)
- Validates: partner owns the property, plan exists, no downgrade (current plan display_order must be less than new plan)
- Creates a `property_subscriptions` row with `status = 'pending_payment'`
- Creates Razorpay order (or test mode) with receipt `sub_{subscriptionId}`
- Returns order details

### Edge Function -- `subscription-verify-payment`
- Verifies Razorpay signature
- Updates `property_subscriptions` row to `status = 'active'`, `payment_status = 'completed'`
- Test mode support (same pattern as existing booking verification)

---

## Phase 3: Admin Panel -- Subscription Plan Manager

**New file:** `src/pages/admin/SubscriptionPlans.tsx`

### Plans Tab (CRUD)
- Table with S.No, Serial Number, Name, Monthly Display Price, Yearly Price, Hostel Bed Limit, Reading Room Seat Limit, Features Count, Status, Actions
- Create/Edit dialog:
  - Name, Slug, Monthly Display Price, Yearly Price
  - Hostel Bed Limit, Reading Room Seat Limit (0 = unlimited)
  - Features checklist (multi-select from master list)
  - Capacity upgrade settings (enable, price per slab, slab sizes)
  - Display Order, Description
  - Status toggle
- Matches existing admin table UI (AdminTablePagination, getSerialNumber, filters)
- Seed 4 default plans (Silver/Gold/Platinum/Diamond) via migration

### Active Subscriptions Tab
- Table showing all property subscriptions across partners
- Columns: S.No, Serial Number, Partner Name, Property Name, Property Type, Plan, Status, Start Date, End Date, Amount, Capacity Upgrades
- Filters: Plan, Status, Property Type, Partner search
- Admin can manually activate/extend subscriptions if needed

---

## Phase 4: Partner Panel -- My Subscriptions

**New file:** `src/pages/partner/MySubscriptions.tsx`

### My Properties & Plans View
- Card per property showing: Property Name, Type, Current Plan (badge), Expiry Date, Days Remaining
- If no plan: "No Active Plan" with "Subscribe Now" button
- If active plan: "Upgrade" button (only shows higher plans), no downgrade option

### Subscribe / Upgrade Flow
- Step 1: Select plan (cards showing Silver/Gold/Platinum/Diamond with features, limits, pricing)
- Step 2: Optional capacity upgrade slabs (auto-calculated from current property size vs plan limit)
- Step 3: Summary (Plan price + Upgrade slabs = Total yearly amount)
- Step 4: Razorpay payment (reuse existing RazorpayCheckout pattern with custom `createOrder`)
- On success: subscription activated, page refreshes

### Restriction Enforcement
- Display warning if property exceeds plan capacity
- Auto-upgrade popup suggestion when adding beds/seats beyond limit

---

## Phase 5: Feature Gating Hook

**New file:** `src/hooks/useSubscriptionAccess.ts`

Hook that checks the current property's subscription and returns:
- `currentPlan` -- plan details
- `hasFeature(featureKey)` -- boolean check
- `isWithinCapacity(currentCount)` -- boolean
- `daysRemaining` -- number
- `isExpired` -- boolean
- `needsUpgrade` -- boolean (capacity exceeded)

Used across the app to conditionally show/hide features:
- Business Performance page: gated behind `basic_analytics` or `advanced_analytics`
- Sponsored Listings: gated behind `sponsored_eligible` or `sponsored_priority`
- Settlement tracking: gated behind `settlement_tracking`
- Downloadable reports: gated behind `downloadable_reports`

When a feature is restricted, show a locked card with "Upgrade to [Plan Name] to unlock this feature" message.

---

## Phase 6: Capacity Enforcement

Modify bed/seat creation logic:
- When partner adds a bed (hostel) or seat (reading room), check against plan limits + purchased upgrades
- `effectiveLimit = planLimit + (capacityUpgrades * slabSize)`
- If `currentCount >= effectiveLimit`, block creation and show upgrade prompt
- Admin is exempt from capacity checks

---

## Phase 7: Routing & Navigation

- Add route `/admin/subscription-plans` and `/partner/my-subscriptions`
- Add "Subscription Plans" to AdminSidebar under a "Billing" or "Platform" section
- Add "My Subscriptions" to partner sidebar

---

## File Changes Summary

| Action | File |
|--------|------|
| DB Migration | Create `subscription_plans` + `property_subscriptions` tables, triggers, seed data |
| Create | `supabase/functions/subscription-create-order/index.ts` |
| Create | `supabase/functions/subscription-verify-payment/index.ts` |
| Create | `src/pages/admin/SubscriptionPlans.tsx` |
| Create | `src/pages/partner/MySubscriptions.tsx` |
| Create | `src/hooks/useSubscriptionAccess.ts` |
| Modify | `src/App.tsx` (add routes) |
| Modify | `src/components/admin/AdminSidebar.tsx` (add menu items) |
| Modify | `src/pages/partner/BusinessPerformance.tsx` (add feature gate) |

---

## Key Business Rules Enforced

- **No downgrades**: Upgrade flow only shows plans with higher `display_order` than current
- **No refunds**: Payment is final, no refund mechanism
- **Yearly billing**: All plans are annual (`price_yearly`), monthly price is display-only
- **Per property**: Each property needs its own subscription independently
- **Admin full control**: Can edit plan prices, features, limits at any time; changes apply to new subscriptions
- **Auto-expire**: Subscriptions expire after `end_date`; partner must renew
- **Capacity slabs**: Extra beds/seats beyond plan limit cost Rs 300 per slab (configurable by admin)
