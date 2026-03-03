

# Fix Capacity Upgrade Pricing (Per Month) + Diamond Universal Package

## Changes

### 1. Capacity Upgrade Price = Per Month, Billed Yearly

Currently, `capacity_upgrade_price` (e.g. 300) is treated as a flat one-time amount per slab. The user wants it to be **per month**, so the yearly cost per slab = `capacity_upgrade_price * 12`.

**Files to update:**

| File | Change |
|------|--------|
| `src/pages/partner/MySubscriptions.tsx` | Update `totalAmount` calculation: `capacityUpgrades * selectedPlan.capacity_upgrade_price * 12` instead of `* price`. Update all display text to show "/month per slab" and the yearly total. |
| `src/pages/admin/SubscriptionPlans.tsx` | Update label from "Price per Slab" to "Price per Slab/Month". No formula change needed in admin (admin just sets the monthly rate). |
| `supabase/functions/subscription-create-order/index.ts` | Update: `capacityUpgradeAmount = capacityUpgrades * plan.capacity_upgrade_price * 12` |

**Example:** If `capacity_upgrade_price = 300` and partner picks 2 slabs:
- Monthly cost: 2 x 300 = 600/month
- Yearly cost: 600 x 12 = 7,200 added to the subscription total

### 2. Diamond Plan = Universal Package (Multiple Properties)

Currently, subscriptions are **per-property** -- each reading room or hostel needs its own subscription. The Diamond plan should act as a **universal package**: one subscription covers ALL the partner's reading rooms and hostels.

**Approach:** Add a `is_universal` boolean column to `subscription_plans`. When a plan has `is_universal = true`:

- In the partner UI, skip property selection -- subscribe at the partner level
- The subscription record stores `property_id = NULL` and `property_type = 'universal'`
- The `useSubscriptionAccess` hook checks: if any active subscription with `property_type = 'universal'` exists for the partner, all properties are covered
- Admin form gets a new "Universal Package" toggle for plans

**Database migration:**
```sql
ALTER TABLE subscription_plans ADD COLUMN is_universal boolean NOT NULL DEFAULT false;
ALTER TABLE property_subscriptions ALTER COLUMN property_id DROP NOT NULL;
```

**Files to update:**

| File | Change |
|------|--------|
| `src/pages/admin/SubscriptionPlans.tsx` | Add "Universal Package" toggle to form; show in table |
| `src/pages/partner/MySubscriptions.tsx` | When a universal plan is selected, skip property selection step; show a "Subscribe for All Properties" card; pass `propertyType: 'universal', propertyId: null` to edge function |
| `supabase/functions/subscription-create-order/index.ts` | Handle `propertyType === 'universal'`: skip property ownership check, set `property_id: null` |
| `src/hooks/useSubscriptionAccess.ts` | Add fallback: if no property-specific subscription, check for any `universal` subscription for the same partner |

### 3. Display Changes in Partner Subscription Flow

**Step 2 (Capacity Upgrades):**
- Show: "Add upgrade slabs at Rs X/month each (billed yearly: Rs X*12/slab)"
- Extra capacity line: show monthly and yearly breakdown
- e.g. "+2 slabs = Rs 600/month (Rs 7,200/year)"

**Step 3 (Order Summary):**
- Show capacity upgrade as: "Capacity Upgrades (2 slabs x Rs 300/mo x 12)" with yearly total

## Technical Details

- The `capacity_upgrade_price` column meaning changes from "flat price" to "monthly price per slab" -- existing data (300) already makes sense as a monthly rate
- Diamond plan in DB already has `hostel_bed_limit: 0` and `reading_room_seat_limit: 0` (unlimited), which is correct for a universal plan
- The universal subscription uses `property_type = 'universal'` to distinguish from per-property subscriptions
- `useSubscriptionAccess` will first check property-specific subscription, then fall back to checking universal subscription via partner lookup

